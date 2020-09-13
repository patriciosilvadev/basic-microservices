const express = require("express");
const bodyParser = require("body-parser");
const { randomBytes } = require("crypto");
const cors = require("cors");
const { default: axios } = require("axios");

const app = express();

const commentsByPostId = {};
app.use(cors());
app.use(bodyParser.json());
app.get("/posts/:id/comments", (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

app.post("/posts/:id/comments", async (req, res) => {
  const commentId = randomBytes(4).toString("hex");
  const { content } = req.body;
  const comments = commentsByPostId[req.params.id] || [];
  comments.push({ id: commentId, content, status: "pending" });
  commentsByPostId[req.params.id] = comments;
  await axios.post("http://event-bus-srv:4005/events", {
    type: "CommentCreated",
    data: { id: commentId, content, postId: req.params.id, status: "pending" }
  });
  res.status(201).send(comments);
});

app.post("/events", async (req, res) => {
  console.log("received event", req.body.type);
  const { type, data } = req.body;
  if (type === "CommentModerated") {
    const { postId, id } = data;
    const comments = commentsByPostId[postId];
    const comment = comments.find(com => com.id === id);
    comment.status = data.status;
    await axios.post("http://event-bus-srv:4005/events", {
      type: "CommentUpdated",
      data: { ...data }
    });
  }
  res.send({});
});

app.listen(4001, () => console.log("server started on port 4001"));
