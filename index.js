const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wotzmkf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const foodCollection = client.db("foodsDB").collection("foods");

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        //   .cookie("token", token, cookieOption)
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          // sameSite: 'none'
        })
        .send({ success: true });
    });


    app.get("/foods", async (req, res) => {
        const cursor = foodCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      });
      
      
      app.post("/foods", async (req, res) => {
        const food = req.body;
        console.log(food);
        const result = await foodCollection.insertOne(food);
        res.send(result);
      });
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("food server is running");
});

app.listen(port, () => {
  console.log(` food server is running on port: ${port}`);
});
