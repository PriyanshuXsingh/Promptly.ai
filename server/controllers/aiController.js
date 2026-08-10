import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import FormData from "form-data";
import pdf from "pdf-parse/lib/pdf-parse.js";

const AI = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached.Upgrade to Premium.",
      });
    }
    const response = await AI.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: length,
    });

    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations (user_id,prompt,content,type)
    VALUES (${userId},${prompt},${content},'article')`;

    if (plan != "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached.Upgrade to Premium.",
      });
    }
    const response = await AI.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const content = response.choices[0].message.content;

    await sql`INSERT INTO creations (user_id,prompt,content,type)
    VALUES (${userId},${prompt},${content},'blog-title')`;

    if (plan != "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: {
          free_usage: free_usage + 1,
        },
      });
    }

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish,style} = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only for premium users.",
      });
    }

    // ✅ FormData for ImagineArt API
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("style", style?.toLowerCase() );
    const hfResponse = await axios.post(
      "https://api.vyro.ai/v2/image/generations",
      formData,
      {
        headers: {
          Authorization: `Bearer ${process.env.IMAGINE_API_KEY}`,
          ...formData.getHeaders(), // very important
        },
        responseType: "arraybuffer", // because it returns image
      }
    );

    const base64Image = `data:image/png;base64,${Buffer.from(
      hfResponse.data,
      "binary"
    ).toString("base64")}`;

    const { secure_url } = await cloudinary.uploader.upload(base64Image);

    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.log("🔥 ImagineArt generateImage Error:", error.response?.data || error.message);
    res.json({ success: false, message: error.message });
  }
};

export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const image = req.file; // multer se aana chahiye
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only for premium users.",
      });
    }

    if (!image) {
      return res.json({ success: false, message: "No image uploaded." });
    }

    // ✅ Upload to Cloudinary with background removal
    const { secure_url } = await cloudinary.uploader.upload(image.path, {
      transformation: [
        {
          effect: "background_removal",
          background_removal: "cloudinary_ai", // ✅ correct value
        },
      ],
    });

    // ✅ Save result to database
    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')
    `;

    res.json({ success: true, content: secure_url });
  } catch (error) {
    console.log("🔥 Error in background removal:", error.message);
    res.json({ success: false, message: error.message });
  }
};

export const removeObjectImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const image = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only for premium users.",
      });
    }

    const { public_id } = await cloudinary.uploader.upload(image.path);

    const imageUrl = cloudinary.url(public_id, {
      transformation: [{ effect: `gen_remove:${object}` }],
      resource_type: "image",
    });

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image' )
    `;

    res.json({ success: true, content: imageUrl });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();

    const resume = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "This feature is only for premium users.",
      });
    }

    if (resume.size > 5 * 1024 * 1024) {
      return res.json({
        success: false,
        message: "Resume file exceeds allowed sixe(5 MB).",
      });
    }

    const dataBuffer = fs.readFileSync(resume.path);
    const pdfData = await pdf(dataBuffer);

   const prompt = `
You are a professional resume reviewer and career coach.

Analyze the resume carefully and provide a clean, professional, easy-to-read review.

IMPORTANT FORMATTING RULES:
- Return ONLY Markdown.
- Do NOT use HTML tags such as <br>, <p>, <div>, etc.
- Do NOT use raw HTML.
- Use clear Markdown headings with ## and ###.
- Use bullet points where appropriate.
- Use numbered lists for ordered recommendations.
- Use Markdown tables only when they genuinely improve readability.
- Keep each section concise and well organized.
- Do not repeat the same information.
- Give specific and actionable recommendations.

Use exactly this structure:

## Overall Impression

Give a short overall assessment of the resume.

## Key Strengths

- Strength 1
- Strength 2
- Strength 3

## Areas for Improvement

### 1. Header & Contact Information
Explain what is good and what should be improved.

### 2. Summary / Objective
Explain what should be improved.

### 3. Education
Give feedback.

### 4. Skills
Give feedback.

### 5. Projects
Give feedback.

### 6. Experience
Give feedback.

### 7. Achievements & Certifications
Give feedback.

### 8. Formatting & ATS
Give feedback.

## Priority Improvements

1. Most important improvement
2. Second most important improvement
3. Third most important improvement

## Final Verdict

Give a concise final assessment and mention what the candidate should focus on first.

RESUME CONTENT:

${pdfData.text}
`;

    const response = await AI.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    const content = response.choices[0].message.content;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review' )
    `;

    res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
