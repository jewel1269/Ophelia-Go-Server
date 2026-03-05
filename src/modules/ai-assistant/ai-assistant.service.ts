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
  তোমার নাম পুকু। তুমি "Ophelia" শপিং প্ল্যাটফর্মের স্মার্ট অ্যাসিস্ট্যান্ট।
  ১. ইউজারের বাজেট এবং চাহিদা বুঝে প্রোডাক্ট সাজেস্ট করবে।
  ২. ইউজার যদি কিছু কিনতে চায়, তার থেকে নাম, ফোন এবং ডেলিভারি অ্যাড্রেস চেয়ে নিবে।
  ৩. সব তথ্য পেলে 'placeOrder' ফাংশনটি কল করে অর্ডার কনফার্ম করবে।
  ৪. সবসময় শুদ্ধ বাংলায় এবং প্রফেশনালি কথা বলবে।
  ৫. **Response অবশ্যই plain text হবে**, কোনো quotation marks, code block বা JSON formatting ব্যবহার করবে না।
  ৬. সুন্দর করে conversational বাংলা লিখবে, যেন মানুষ পড়েও বুঝতে পারে।
`,

      tools: [
        {
          functionDeclarations: [
            {
              name: 'searchProducts',
              description:
                'বাজেট এবং ক্যাটাগরি অনুযায়ী প্রোডাক্ট খুঁজে বের করে',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  name: {
                    type: SchemaType.STRING,
                    description: 'প্রোডাক্টের ধরন',
                  },
                  maxPrice: {
                    type: SchemaType.NUMBER,
                    description: 'সর্বোচ্চ বাজেট',
                  },
                },
                required: ['name'],
              },
            },
            {
              name: 'placeOrder',
              description: 'ইউজারের জন্য নতুন অর্ডার তৈরি করে',
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  productId: { type: SchemaType.STRING },
                  address: { type: SchemaType.STRING },
                  phone: { type: SchemaType.STRING },
                },
                required: ['productId', 'address', 'phone'],
              },
            },
          ],
        },
      ],
    });
  }

  async create(userChat: CreateAiAssistantDto) {
    try {
      const chat = this.model.startChat();
      const result = await chat.sendMessage(userChat.message);
      const call = result.response.functionCalls()?.[0];
      console.log(call);

      if (call) {
        if (call.name === 'searchProducts') {
          const searchQuery = call.args.query?.toLowerCase() || '';
          console.log(searchQuery, call.args.maxPrice);

          const products = await this.prisma.product.findMany({
            where: {
              OR: [
                { name: { contains: searchQuery, mode: 'insensitive' } },
                { description: { contains: searchQuery, mode: 'insensitive' } },
              ],
              price: { lte: call.args.maxPrice || 1000000 },
            },
            take: 3,
          });
          const followUp = await chat.sendMessage([
            {
              functionResponse: {
                name: 'searchProducts',
                response: { content: products },
              },
            },
          ]);

          return { text: followUp.response.text(), products };
        }

        if (call.name === 'placeOrder') {
          const product = await this.prisma.product.findUnique({
            where: { id: call.args.productId },
          });
          if (!product) return { text: 'দুঃখিত, এই প্রোডাক্টটি পাওয়া যায়নি।' };

          if (!userChat?.userId) {
            throw new Error('User not found');
          }

          const generatedOrderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const order = await this.prisma.order.create({
            data: {
              orderNumber: generatedOrderNumber,
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
                  orderNumber: generatedOrderNumber,
                },
              },
            },
          });

          const confirmation = await chat.sendMessage([
            {
              functionResponse: {
                name: 'placeOrder',
                response: {
                  content: `অর্ডার সফল হয়েছে! অর্ডার নাম্বার: ${order.orderNumber}`,
                },
              },
            },
          ]);
          return { text: confirmation.response.text(), orderId: order.id };
        }
      }

      return { text: result.response.text() };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException(
        'পুকু এই মুহূর্তে কথা বলতে পারছে না।',
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
        'Failed to analyze image: ' + error.message,
      );
    }
  }
}
