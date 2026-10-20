import { provinces } from "./data/provinces.mjs";
import { normalizeVietnamese } from "./utils/normalize.mjs";

export const provincesHandler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod;
  
  if (method !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Allow": "GET",
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  const q = event?.queryStringParameters?.q ?? "";
  const normalizedQ = normalizeVietnamese(q);
  
  let result = provinces;
  if (normalizedQ) {
    result = provinces.filter(p => normalizeVietnamese(p.name).includes(normalizedQ));
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600"
    },
    body: JSON.stringify(result)
  };
};

export const handler = provincesHandler;
