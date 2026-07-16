import axios from "axios";

const AI_URL = "http://127.0.0.1:8000";

export class AIService {

  async demand() {
    const res = await axios.get(`${AI_URL}/ai/demand`);
    return res.data;
  }

  async promotion() {
    const res = await axios.get(`${AI_URL}/ai/promotion`);
    return res.data;
  }

  async forecast() {
    const res = await axios.get(`${AI_URL}/ai/forecast`);
    return res.data;
  }

  async risk() {
    const res = await axios.get(`${AI_URL}/ai/risk`);
    return res.data;
  }

  // OPTIONAL: if not used, remove controller route OR add this
  async recommendations() {
    return [];
  }
}