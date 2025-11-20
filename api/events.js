// api/events.js - Vercel Serverless Function (Node.js)

// 載入 Gemini SDK
// Vercel 會根據 package.json 安裝這個套件
const { GoogleGenAI } = require('@google/genai');

// 這是 Vercel Function 的標準入口點
export default async function handler(req, res) {
    
    // --- 1. CORS 設定 (允許前端跨域呼叫) ---
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 處理 OPTIONS 請求（瀏覽器發出的預檢請求）
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // --- 2. 獲取 API Key ---
    // 從 Vercel 環境變數中安全地讀取 API Key (這是安全關鍵)
    const GOOGLE_API_KEY = process.env.GEMINI_API_KEY; 

    if (!GOOGLE_API_KEY) {
        // 如果 Key 沒設定，傳回伺服器錯誤
        return res.status(500).json({ 
            error: "Server Error: Gemini API Key not configured.",
            message: "請確認您在 Vercel Environment Variables 中已設定 GEMINI_API_KEY。"
        });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
        const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });
        
        // --- 3. 呼叫 Gemini API ---
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                You are a trendy lifestyle editor for "Weekend Vibes North".
                CURRENT DATE: ${today}
                SEARCH RANGE: From NOW until December 2026.
                TASK: Search for REAL, CONFIRMED events in Northern Taiwan (Taipei, New Taipei, Keelung, Taoyuan). CRITICAL: ONLY return events happening ON or AFTER today (${today}).
                OUTPUT REQUIREMENTS: Return a valid JSON array. DO NOT include any conversational text, markdown formatting, or introductory phrases. Just the raw JSON array.
            `,
            config: {
                // 啟用 Google Search Tool 來獲取最新的活動資訊
                tools: [{ googleSearch: {} }],
            }
        });

        const text = response.text;
        if (!text) return res.status(500).json([]);
        
        // --- 4. JSON 清理與解析 ---
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const match = cleanText.match(/\[.*\]/s);

        let cleanData = [];
        if (match && match[0]) {
            try {
                // 解析 JSON 陣列
                cleanData = JSON.parse(match[0]);
            } catch (e) {
                console.error("Failed to parse Gemini JSON output:", e, "Raw Text:", match[0]);
                return res.status(500).json({ error: "Gemini response parsing failed." });
            }
        } else {
            console.error("Gemini Response does not contain a valid JSON array pattern:", text);
        }
        
        // --- 5. 傳回結果 ---
        // 將乾淨的 JSON 活動陣列傳回給前端
        res.status(200).json(cleanData); 

    } catch (error) {
        console.error("Internal Gemini API Call Error:", error);
        res.status(500).json({ error: "Failed to process request due to internal error." });
    }
}
