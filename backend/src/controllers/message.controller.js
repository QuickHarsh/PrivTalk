import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

export const getUsersForSidebar = async (req,res) => {
    try {
        const loggedInUserID = req.user._id;
        const filteredUsers = await User.find({_id: {$ne:loggedInUserID}}).select("-password");

        // Get the last message for each user
        const usersWithLastMessage = await Promise.all(
            filteredUsers.map(async (user) => {
                const lastMessage = await Message.findOne({
                    $or: [
                        { senderID: loggedInUserID, receiverID: user._id },
                        { senderID: user._id, receiverID: loggedInUserID }
                    ]
                }).sort({ createdAt: -1 });

                return {
                    ...user.toObject(),
                    lastMessage: lastMessage || null,
                    unreadCount: await Message.countDocuments({
                        senderID: user._id,
                        receiverID: loggedInUserID,
                        read: false
                    })
                };
            })
        );

        // Sort users by last message time (most recent first)
        const sortedUsers = usersWithLastMessage.sort((a, b) => {
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
        });

        res.status(200).json(sortedUsers);
    } catch (error) {
        console.log("Error in getUsersForSidebar: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}

export const getMessages = async (req,res) => {
    try {
        const { id: userToChatId } = req.params
        const myId = req.user._id;

        // Verify that the user is trying to access their own conversation
        if (userToChatId !== myId) {
            const message = await Message.find({
                $or:[
                    {senderID:myId, receiverID:userToChatId},
                    {senderID:userToChatId, receiverID:myId}
                ]
            }).sort({ createdAt: 1 });
            res.status(200).json(message);
        } else {
            res.status(403).json({ error: "Unauthorized access" });
        }
    } catch (error) {
        console.log("Error in getMessages controller ", error.message);
        res.status(500).json({ error: "Internal server error" })
    }
}

export const sendMessage = async (req,res) => {
    try {
        const { text, image, video, fileType, fileName } = req.body;
        const { id: receiverID } = req.params;
        const senderID = req.user._id;

        // Verify that the user is not sending a message to themselves
        if (senderID === receiverID) {
            return res.status(400).json({ error: "Cannot send message to yourself" });
        }

        let imageUrl, videoUrl;
        if (image && fileType === 'image'){
            //upload base64 image to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(image, {
                resource_type: "image",
                folder: "chat_images"
            });
            imageUrl = uploadResponse.secure_url;
        }

        if (video && fileType === 'video') {
            //upload video to cloudinary
            const uploadResponse = await cloudinary.uploader.upload(video, {
                resource_type: "video",
                folder: "chat_videos"
            });
            videoUrl = uploadResponse.secure_url;
        }

        const newMessage = new Message({
            senderID,
            receiverID,
            text,
            image: imageUrl,
            video: videoUrl,
            fileType,
            fileName
        })

        await newMessage.save();

        // Only emit to the specific receiver
        const receiverSocketId = getReceiverSocketId(receiverID);
        if (receiverSocketId){
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage)
    } catch (error) {
        console.log("Error in sendMessage controller: ", error.message);
        res.status(500).json({ error: "Internal server error" })
    }
}

export const markMessagesAsRead = async (req, res) => {
    try {
        const { id: senderId } = req.params;
        const receiverId = req.user._id;

        await Message.updateMany(
            {
                senderID: senderId,
                receiverID: receiverId,
                read: false
            },
            { $set: { read: true } }
        );

        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        console.log("Error in markMessagesAsRead: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};