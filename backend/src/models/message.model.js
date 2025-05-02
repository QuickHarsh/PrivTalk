import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiverID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        text: {
            type: String,
        },
        image: {
            type: String,
        },
        video: {
            type: String,
        },
        fileType: {
            type: String,
            enum: ['image', 'video', 'text'],
            default: 'text'
        },
        fileName: {
            type: String,
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;