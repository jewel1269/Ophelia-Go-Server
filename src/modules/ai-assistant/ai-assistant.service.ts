import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { CreateAiAssistantDto } from './dto/create-ai-assistant.dto';
import { PrismaService } from 'src/common/database/prisma.service';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY is not defined in .env');
    }
    this.genAI = new GoogleGenerativeAI(apiKey || '');

    this.model = this.genAI.getGenerativeModel({
      model: 'models/gemini-3-flash-preview',

      systemInstruction: `
You are Puku (পুকু), the official AI shopping assistant for Ophelia — a modern fashion e-commerce platform based in Bangladesh.

LANGUAGE RULE:
- Detect the language the user is writing in (Bengali or English) and always respond in that same language.
- If the user switches language mid-conversation, switch with them.
- Never mix languages in a single response unless the user does it first.

CONVERSATION FLOW — follow this order strictly:

STEP 1 — GREETING:
Greet the user warmly and introduce yourself as Puku, Ophelia's shopping assistant.
Keep it short. Then ask for their email address to continue.

STEP 2 — USER IDENTIFICATION:
As soon as the user provides an email, call checkUserByEmail with that email.
- If account found: Welcome them by name and ask how you can help them today.
- If account not found: Politely tell them to register first at our website. They can still browse products but cannot place orders.

STEP 3 — REQUIREMENT GATHERING:
Ask about:
- What product they are looking for
- Their budget range
- Preferences (brand, color, size, category, etc.)
Ask one or two questions at a time, not everything at once.

STEP 4 — PRODUCT SEARCH:
When you have enough information, call searchProducts.
After getting results, tell the user how many products were found and describe them briefly.
The system will display the product cards automatically — you don't need to list them in text.

STEP 5 — SEARCH REFINEMENT:
If the user wants cheaper options, a different brand, or different category, call searchProducts again with updated parameters.

STEP 6 — ORDER PLACEMENT:
When a user wants to buy a product:
1. Confirm the product name and price.
2. Ask for their delivery address.
3. Ask for their phone number.
4. Summarize the order details and ask for final confirmation.
5. Only after explicit confirmation (yes/হ্যাঁ/confirm), call placeOrder.
6. After success, share the order number and thank them.

IMPORTANT RULES:
- Respond in plain conversational text only. No markdown (**, ##, etc.), no JSON, no bullet symbols unless natural.
- Never call placeOrder without getting address, phone number, AND final user confirmation.
- If no products found, suggest the user try different keywords or a higher budget.
- Be helpful, concise, and warm at all times.
- Do not ask for information you already have from history.
`,

      tools: [
        {
          functionDeclarations: [
            {
              name: 'checkUserByEmail',
              description:
                'Checks if a user account exists with the given email address',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  email: {
                    type: SchemaType.STRING,
                    description: 'The email address provided by the user',
                  },
                },
                required: ['email'],
              },
            },
            {
              name: 'searchProducts',
              description:
                'Searches for products based on name/type, budget and category preferences',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  name: {
                    type: SchemaType.STRING,
                    description:
                      'Product name or type to search for (e.g. "kurti", "saree", "shoes")',
                  },
                  maxPrice: {
                    type: SchemaType.NUMBER,
                    description: 'Maximum budget in BDT taka',
                  },
                  category: {
                    type: SchemaType.STRING,
                    description:
                      'Category preference (e.g. "Women", "Men", "Kids")',
                  },
                },
                required: ['name'],
              },
            },
            {
              name: 'placeOrder',
              description:
                'Places an order for the user after they confirm all details',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  productId: {
                    type: SchemaType.STRING,
                    description: 'The product ID to order',
                  },
                  address: {
                    type: SchemaType.STRING,
                    description: 'Full delivery address',
                  },
                  phone: {
                    type: SchemaType.STRING,
                    description: 'Contact phone number',
                  },
                },
                required: ['productId', 'address', 'phone'],
              },
            },
          ],
        },
      ],
    });
  }

  async chat(userChat: CreateAiAssistantDto) {
    try {
      // Gemini requires history to start with a 'user' turn — strip leading model turns
      const rawHistory = userChat.history ?? [];
      const firstUserIdx = rawHistory.findIndex((h) => h.role === 'user');
      const safeHistory = firstUserIdx === -1 ? [] : rawHistory.slice(firstUserIdx);

      const chat = this.model.startChat({ history: safeHistory });

      let currentResult = await chat.sendMessage(userChat.message);

      const responseProducts: any[] = [];
      let responseOrderId: string | undefined;

      // Handle all function calls in a loop (AI may call multiple functions)
      while (true) {
        const calls = currentResult.response.functionCalls?.() ?? [];
        if (!calls.length) break;

        const call = calls[0];
        let callResult: any;

        switch (call.name) {
          case 'checkUserByEmail': {
            const user = await this.prisma.user.findUnique({
              where: { email: call.args.email },
              select: { id: true, name: true, email: true },
            });
            callResult = user
              ? {
                  found: true,
                  id: user.id,
                  name: user.name,
                  email: user.email,
                }
              : { found: false };
            break;
          }

          case 'searchProducts': {
            const name = (call.args.name as string) ?? '';
            const products = await this.prisma.product.findMany({
              where: {
                AND: [
                  { isArchived: false },
                  { stock: { gt: 0 } },
                  {
                    OR: [
                      { name: { contains: name, mode: 'insensitive' } },
                      { description: { contains: name, mode: 'insensitive' } },
                      { tags: { has: name.toLowerCase() } },
                    ],
                  },
                  call.args.maxPrice
                    ? {
                        OR: [
                          { discountPrice: { lte: call.args.maxPrice } },
                          {
                            AND: [
                              { discountPrice: null },
                              { price: { lte: call.args.maxPrice } },
                            ],
                          },
                        ],
                      }
                    : {},
                  call.args.category
                    ? {
                        category: {
                          name: {
                            contains: call.args.category,
                            mode: 'insensitive',
                          },
                        },
                      }
                    : {},
                ],
              },
              include: { category: { select: { name: true } } },
              take: 5,
              orderBy: { orderCount: 'desc' },
            });

            const mapped = products.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: p.price,
              discountPrice: p.discountPrice,
              thumbnail: p.thumbnail,
              category: p.category.name,
            }));

            responseProducts.push(...mapped);

            callResult =
              mapped.length > 0
                ? {
                    count: mapped.length,
                    products: mapped.map((p) => ({
                      name: p.name,
                      price: p.discountPrice ?? p.price,
                      category: p.category,
                    })),
                  }
                : { count: 0, message: 'No products found' };
            break;
          }

          case 'placeOrder': {
            if (!userChat.userId) {
              callResult = {
                success: false,
                error: 'User must be logged in to place an order.',
              };
              break;
            }

            const product = await this.prisma.product.findUnique({
              where: { id: call.args.productId },
            });

            if (!product) {
              callResult = { success: false, error: 'Product not found.' };
              break;
            }

            const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const order = await this.prisma.order.create({
              data: {
                orderNumber,
                userId: userChat.userId,
                subTotal: product.price,
                shippingCost: 60,
                totalAmount: product.price + 60,
                shippingAddress: {
                  address: call.args.address,
                  phone: call.args.phone,
                },
                orderItems: {
                  create: {
                    productId: product.id,
                    quantity: 1,
                    price: product.price,
                    orderNumber,
                  },
                },
              },
            });

            responseOrderId = order.id;
            callResult = {
              success: true,
              orderNumber: order.orderNumber,
              total: product.price + 60,
            };
            break;
          }

          default:
            callResult = { error: `Unknown function: ${call.name}` };
        }

        // Send function result back to AI for it to generate the next response
        currentResult = await chat.sendMessage([
          {
            functionResponse: {
              name: call.name,
              response: { content: callResult },
            },
          },
        ]);
      }

      return {
        text: currentResult.response.text(),
        products: responseProducts.length > 0 ? responseProducts : undefined,
        orderId: responseOrderId,
      };
    } catch (error) {
      this.logger.error('AI chat error:', error);
      throw new InternalServerErrorException(
        'পুকু এই মুহূর্তে কথা বলতে পারছে না। একটু পরে আবার চেষ্টা করুন।',
      );
    }
  }

  async getProductTitle(file: Express.Multer.File): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'models/gemini-3-flash-preview',
      });

      const imagePart = {
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: file.mimetype,
        },
      };

      const prompt = `Look at this product image and return ONLY a short 2-5 word product search title.
Rules:
- No punctuation, no explanation, no extra text
- Just the product name/title suitable for an e-commerce search
- Example outputs: "red-floral-maxi-dress", "gold-hoop-earrings", "leather-tote-bag"
Output only the title:`;

      const result = await model.generateContent([prompt, imagePart]);
      const text = result.response.text().trim();
      return text.replace(/^["']|["']$/g, '').trim();
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to analyze image: ' + (error as Error).message,
      );
    }
  }
}
