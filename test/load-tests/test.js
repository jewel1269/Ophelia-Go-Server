import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 40000,       
  duration: '200s' 
};

export default function () {
  http.get('http://localhost:5000/api/v1');
  sleep(1);
}