/*
 * MỸ NGÔN AI - BẢN GITHUB PAGES
 *
 * CHỈNH 3 API KEY Ở ĐÂY.
 * Lưu ý: không nên để key trong repository PUBLIC.
 * Bản này phù hợp nhất khi repository chỉ mình bạn sử dụng.
 */
const GEMINI_API_KEYS = [
  "AIzaSyDtpPNExXJwgFmXYnljNfi2VcwSw7YDTm4",
  "AIzaSyDuKRZZ9otB6gmdGNeL0Zy5SwYsy5yFYKw",
  "AIzaSyCnpI8OpHgap1LNMVwjZGWBYVSzlkKMk6c"
];

let currentKey = 0;

// Danh sách model dự phòng. Nếu model đầu không dùng được,
// app sẽ thử model tiếp theo trên cùng API key.
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash"
];

function validKeys() {
  return GEMINI_API_KEYS.filter(k =>
    k && !k.startsWith("DAN_API_KEY_") && k.length > 20
  );
}

async function callGemini(apiKey, model, prompt) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      contents: [{parts: [{text: prompt}]}],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || `HTTP ${response.status}`;
    const error = new Error(msg);
    error.status = response.status;
    throw error;
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map(p => p.text || "")
    .join("") || "";

  if (!text) throw new Error("Gemini không trả về nội dung.");
  return JSON.parse(text);
}

async function generate() {
  const input = document.getElementById("input").value.trim();
  const topic = document.getElementById("topic").value;
  const style = document.getElementById("style").value;
  const level = document.getElementById("level").value;
  const count = Number(document.getElementById("count").value);

  if (!input) {
    document.getElementById("status").textContent = "Hãy nhập một câu nói trước.";
    return;
  }

  const keys = validKeys();
  if (!keys.length) {
    document.getElementById("status").textContent =
      "Bạn chưa điền 3 Gemini API key trong file script.js.";
    return;
  }

  const prompt = `
Bạn là chuyên gia viết lại câu nói tiếng Việt.

Nhiệm vụ:
Biến câu nói gốc thành các câu mới có cùng ý nghĩa cốt lõi,
nhưng giàu hình ảnh, cảm xúc và ngôn từ hơn.

CÂU GỐC:
${input}

CHỦ ĐỀ:
${topic}

PHONG CÁCH:
${style}

MỨC ĐỘ HOA MỸ:
${level}

YÊU CẦU:
- Tạo đúng ${count} phiên bản.
- Giữ nguyên thông điệp chính.
- Không sao chép nguyên văn câu gốc.
- Tiếng Việt tự nhiên, dễ đọc.
- Có thể sử dụng ẩn dụ và hình ảnh.
- Không giải thích dài dòng.
- Các phiên bản phải khác nhau rõ ràng.
- Chỉ trả JSON theo đúng cấu trúc:
{"results":["câu 1","câu 2","câu 3"]}
`;

  const button = document.getElementById("go");
  const status = document.getElementById("status");
  const results = document.getElementById("results");

  button.disabled = true;
  status.textContent = "Đang viết...";
  results.innerHTML = "";

  let lastError = null;

  // Luân phiên API: API 1 -> API 2 -> API 3 -> API 1...
  for (let attempt = 0; attempt < keys.length; attempt++) {
    const keyIndex = (currentKey + attempt) % keys.length;
    const key = keys[keyIndex];

    for (const model of MODELS) {
      try {
        const data = await callGemini(key, model, prompt);

        currentKey = (keyIndex + 1) % keys.length;

        (data.results || []).forEach((text, i) => {
          const box = document.createElement("div");
          box.className = "result";

          const p = document.createElement("p");
          p.textContent = `${i + 1}. ${text}`;

          const copy = document.createElement("button");
          copy.className = "copy";
          copy.textContent = "📋 Sao chép";
          copy.onclick = async () => {
            await navigator.clipboard.writeText(text);
            copy.textContent = "✓ Đã sao chép";
            setTimeout(() => copy.textContent = "📋 Sao chép", 1200);
          };

          box.append(p, copy);
          results.append(box);
        });

        status.textContent = `Đã tạo xong • đang dùng API ${keyIndex + 1}`;
        button.disabled = false;
        return;
      } catch (error) {
        lastError = error;
        // Thử model khác trước, rồi mới chuyển API.
      }
    }
  }

  status.textContent =
    "Không gọi được Gemini. Kiểm tra API key, quota hoặc API restriction.";
  console.error(lastError);
  button.disabled = false;
}

document.getElementById("go").addEventListener("click", generate);
