/*
 * MỸ NGÔN AI - GITHUB PAGES
 * Gemini 3.6 Flash
 *
 * THAY 3 API KEY Ở BÊN DƯỚI.
 */

const GEMINI_API_KEYS = [
  "AIzaSyDtpPNExXJwgFmXYnljNfi2VcwSw7YDTm4",
  "AIzaSyDuKRZZ9otB6gmdGNeL0Zy5SwYsy5yFYKw",
  "AIzaSyCnpI8OpHgap1LNMVwjZGWBYVSzlkKMk6c"
];

const MODEL = "gemini-3.6-flash";

let currentKey = 0;


// ======================================================
// KIỂM TRA API KEY
// ======================================================

function validKeys() {
  return GEMINI_API_KEYS.filter(key =>
    typeof key === "string" &&
    key.trim().length > 20 &&
    !key.startsWith("API_KEY_")
  );
}


// ======================================================
// GỌI GEMINI
// ======================================================

async function callGemini(apiKey, prompt) {

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  let response;

  try {

    response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },

      body: JSON.stringify({

        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],

        generationConfig: {
          temperature: 0.9,
          responseMimeType: "application/json"
        }

      })
    });

  } catch (networkError) {

    const error = new Error(
      "Không thể kết nối tới máy chủ Gemini. Kiểm tra Internet hoặc CORS."
    );

    error.code = "NETWORK";
    throw error;
  }


  // Đọc JSON trả về
  let data = {};

  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }


  // ====================================================
  // XỬ LÝ LỖI HTTP
  // ====================================================

  if (!response.ok) {

    const message =
      data?.error?.message ||
      `Gemini trả về HTTP ${response.status}`;

    const error = new Error(message);

    error.httpStatus = response.status;
    error.apiMessage = message;

    throw error;
  }


  // ====================================================
  // LẤY TEXT
  // ====================================================

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim() || "";


  if (!text) {

    const error = new Error(
      "Gemini trả về kết quả rỗng."
    );

    error.httpStatus = 200;

    throw error;
  }


  // ====================================================
  // PARSE JSON
  // ====================================================

  try {

    return JSON.parse(text);

  } catch (e) {

    console.error("Gemini trả về không phải JSON:", text);

    const error = new Error(
      "Gemini trả về dữ liệu không đúng định dạng JSON."
    );

    error.httpStatus = 200;
    error.rawText = text;

    throw error;
  }
}


// ======================================================
// HIỂN THỊ LỖI
// ======================================================

function getErrorMessage(error, keyNumber) {

  const status = error?.httpStatus;


  // 401
  if (status === 401) {

    return (
      `❌ API ${keyNumber}: Lỗi 401 - API key không hợp lệ hoặc đã hết hiệu lực.\n\n` +
      `→ Kiểm tra lại API key.`
    );
  }


  // 403
  if (status === 403) {

    return (
      `❌ API ${keyNumber}: Lỗi 403 - API key không có quyền sử dụng Gemini API.\n\n` +
      `→ Kiểm tra quyền của API key/project.`
    );
  }


  // 404
  if (status === 404) {

    return (
      `❌ API ${keyNumber}: Lỗi 404 - Model hoặc endpoint không tồn tại.\n\n` +
      `→ Model hiện tại: ${MODEL}`
    );
  }


  // 429
  if (status === 429) {

    return (
      `⚠️ API ${keyNumber}: Lỗi 429 - Đã vượt giới hạn request/quota.\n\n` +
      `→ App sẽ tự chuyển sang API key tiếp theo.`
    );
  }


  // 400
  if (status === 400) {

    return (
      `❌ API ${keyNumber}: Lỗi 400 - Request không hợp lệ.\n\n` +
      `→ ${error.apiMessage || "Kiểm tra dữ liệu gửi tới Gemini."}`
    );
  }


  // 500
  if (status === 500) {

    return (
      `⚠️ API ${keyNumber}: Lỗi 500 - Máy chủ Gemini gặp sự cố.`
    );
  }


  // 503
  if (status === 503) {

    return (
      `⚠️ API ${keyNumber}: Lỗi 503 - Gemini hiện tạm thời không khả dụng.`
    );
  }


  // Network
  if (error?.code === "NETWORK") {

    return (
      `🌐 API ${keyNumber}: Không thể kết nối tới Gemini.\n\n` +
      `→ Kiểm tra Internet hoặc lỗi CORS.`
    );
  }


  // Lỗi khác
  return (
    `❌ API ${keyNumber}: ${error?.message || "Lỗi không xác định."}`
  );
}


// ======================================================
// TẠO CÂU
// ======================================================

async function generate() {

  const input =
    document.getElementById("input").value.trim();

  const topic =
    document.getElementById("topic").value;

  const style =
    document.getElementById("style").value;

  const level =
    document.getElementById("level").value;

  const count =
    Number(document.getElementById("count").value);


  // ----------------------------------------------------
  // Kiểm tra input
  // ----------------------------------------------------

  if (!input) {

    document.getElementById("status").textContent =
      "Hãy nhập một câu nói trước.";

    return;
  }


  // ----------------------------------------------------
  // Kiểm tra API key
  // ----------------------------------------------------

  const keys = validKeys();

  if (keys.length === 0) {

    document.getElementById("status").textContent =
      "❌ Chưa có API key hợp lệ trong script.js.";

    return;
  }


  // ----------------------------------------------------
  // UI
  // ----------------------------------------------------

  const button =
    document.getElementById("go");

  const status =
    document.getElementById("status");

  const results =
    document.getElementById("results");


  button.disabled = true;

  button.textContent = "⏳ Đang viết...";

  status.textContent =
    `Đang kết nối Gemini • API ${currentKey + 1}`;

  results.innerHTML = "";


  // ----------------------------------------------------
  // Prompt
  // ----------------------------------------------------

  const prompt = `
Bạn là chuyên gia viết lại câu nói tiếng Việt.

NHIỆM VỤ:
Biến câu nói gốc thành những câu mới có cùng ý nghĩa
cốt lõi nhưng giàu hình ảnh, cảm xúc và ngôn từ hơn.

CÂU GỐC:
${input}

CHỦ ĐỀ:
${topic}

PHONG CÁCH:
${style}

MỨC ĐỘ HOA MỸ:
${level}

SỐ LƯỢNG:
${count}

YÊU CẦU:

- Tạo đúng ${count} phiên bản.
- Giữ nguyên thông điệp chính.
- Không sao chép nguyên văn câu gốc.
- Tiếng Việt tự nhiên.
- Câu văn có chiều sâu.
- Có thể sử dụng ẩn dụ và hình ảnh.
- Các phiên bản phải khác nhau rõ ràng.
- Không giải thích.
- Chỉ trả về JSON.

ĐỊNH DẠNG BẮT BUỘC:

{
  "results": [
    "câu 1",
    "câu 2",
    "câu 3"
  ]
}
`;


  let lastError = null;


  // ====================================================
  // XOAY 3 API
  // ====================================================

  for (
    let attempt = 0;
    attempt < keys.length;
    attempt++
  ) {

    const keyIndex =
      (currentKey + attempt) % keys.length;

    const key =
      keys[keyIndex];


    status.textContent =
      `Đang thử API ${keyIndex + 1}/${keys.length}...`;


    try {

      const data =
        await callGemini(key, prompt);


      // -----------------------------------------------
      // Thành công
      // -----------------------------------------------

      currentKey =
        (keyIndex + 1) % keys.length;


      if (
        !data ||
        !Array.isArray(data.results) ||
        data.results.length === 0
      ) {

        throw new Error(
          "Gemini không trả về danh sách kết quả."
        );
      }


      // -----------------------------------------------
      // Hiển thị kết quả
      // -----------------------------------------------

      data.results.forEach((text, index) => {

        const box =
          document.createElement("div");

        box.className = "result";


        const p =
          document.createElement("p");

        p.textContent =
          `${index + 1}. ${text}`;


        const copy =
          document.createElement("button");

        copy.className = "copy";

        copy.textContent =
          "📋 Sao chép";


        copy.onclick = async () => {

          try {

            await navigator.clipboard.writeText(text);

            copy.textContent =
              "✓ Đã sao chép";

            setTimeout(() => {

              copy.textContent =
                "📋 Sao chép";

            }, 1200);

          } catch (e) {

            copy.textContent =
              "Không sao chép được";

          }

        };


        box.appendChild(p);

        box.appendChild(copy);

        results.appendChild(box);

      });


      status.textContent =
        `✅ Đã tạo xong • API ${keyIndex + 1} • ${MODEL}`;


      button.disabled = false;

      button.textContent =
        "✨ Tạo câu nói";

      return;


    } catch (error) {

      lastError = error;

      console.error(
        `Gemini API ${keyIndex + 1} lỗi:`,
        error
      );


      // Hiển thị log trong Console
      console.error(
        getErrorMessage(error, keyIndex + 1)
      );


      // -----------------------------------------------
      // Chuyển API tiếp theo
      // -----------------------------------------------

      if (attempt < keys.length - 1) {

        status.textContent =
          `⚠️ API ${keyIndex + 1} lỗi → chuyển sang API ${((keyIndex + 1) % keys.length) + 1}...`;

        await new Promise(resolve =>
          setTimeout(resolve, 500)
        );

      }

    }

  }


  // ====================================================
  // CẢ 3 API ĐỀU LỖI
  // ====================================================

  const finalKeyNumber =
    ((currentKey + keys.length - 1) % keys.length) + 1;

  status.textContent =
    getErrorMessage(
      lastError,
      finalKeyNumber
    );


  button.disabled = false;

  button.textContent =
    "✨ Tạo câu nói";
}


// ======================================================
// BUTTON
// ======================================================

document
  .getElementById("go")
  .addEventListener("click", generate);
