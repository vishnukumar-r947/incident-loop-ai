const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://incident-loop-ai.onrender.com'
).replace(/\/+$/, '');

export default API_URL;
