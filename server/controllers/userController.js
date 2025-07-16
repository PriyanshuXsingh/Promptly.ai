import sql from "../configs/db.js";

export const getUserCreation = async (req, res) => {
  try {
    const { userId } = req.auth();
    const creations = await sql`
            SELECT * FROM creations WHERE user_id = ${userId} order by created_at DESC`;
    res.json({ success: true, creations });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getPublishCreation = async (req, res) => {
  try {
   
    const creations = await sql`
            SELECT * FROM creations WHERE publish = true order by created_at DESC`;
    res.json({ success: true, creations });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const togglelikeCreation = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { id } = req.body;
    const [creations] = await sql`
            SELECT * FROM creations WHERE id = ${id}`;
    if (!creations) {
      return res.json({ success: false, message: "Creation not found." });
    }

    const currentLikes = creations.likes;
    const userIdStr = userId.toString();
    let updatedLikes;
    let message;
    if (currentLikes.includes(userIdStr)) {
      updatedLikes = currentLikes.filter((user) => user !== userIdStr);
      message = "Creation unliked successfully.";
    } else {
      updatedLikes = [...currentLikes, userIdStr];
      message = "Creation liked successfully.";
    }

    const formattedArray = `{${updatedLikes.join(",")}}`;

    await sql`
      UPDATE creations SET likes = ${formattedArray}::text[] WHERE id = ${id}
    `;
    res.json({ success: true, message });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
