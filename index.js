const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://food-projects-9d8e7.web.app",
      "https://food-projects-9d8e7.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wotzmkf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



  const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log("value of token in middleware", token);
    if (!token) {
      return res.status(401).send({ message: "not authorized" });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      // err
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "unauthorized" });
      }
      console.log("value in the token", decoded);
      req.user = decoded;
      next();
      // if token is valid then it would be decoded
    });
  };

const cookieOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" ? true : false,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    const foodCollection = client.db("foodsDB").collection("foods");
    const foodRequestCollection = client
      .db("foodsDB")
      .collection("foodsRequest");

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });

      res.cookie("token", token, cookieOption).send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOption, maxAge: 0 })
        .send({ success: true });
    });




    app.get("/foods", async (req, res) => {


      const cursor = foodCollection.find({ status: "available" });
      cursor.sort({ date: -1 });
      const result = await cursor.toArray();
      console.log(result);
      res.send(result);

    });



    //   details
    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    app.post("/foods", async (req, res) => {
      const food = req.body;
      console.log(food);
      const result = await foodCollection.insertOne(food);
      res.send(result);
    });

    
    //   user related apis
    app.get("/foods-email/:email",verifyToken, async (req, res) => {
      console.log("tok tok token", req.cookies.token);
      console.log("user in the valid token", req.user);

      if (req.user.email !== req.params.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
    
      const query = { email: req.params.email };
      const cursor = foodCollection.find(query);
      const data = await cursor.toArray();
      res.send(data);
    });

    // request
    app.post("/foods-request", async (req, res) => {

        console.log("tok tok token", req.cookies.token);
        console.log("user in the valid token", req.user);
      try {
        const { email, foodId, displayName, location, date, deadline } =
          req.body;

        // Update the food status to "requested"
        await foodCollection.updateOne(
          { _id: new ObjectId(foodId) },
          { $set: { status: "requested" } }
        );

        // Add the food to the user's requested foods
        await foodRequestCollection.insertOne({
          foodId,
          email,
          displayName,
          location,
          date,
          deadline,
        });

        res.status(200).json({ message: "Food requested successfully" });
      } catch (error) {
        console.error("Error requesting food:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    app.get("/request-email/:email",verifyToken, async (req, res) => {

        console.log("tok tok token request", req.cookies.token);
      console.log("user in the valid token", req.user);

      if (req.user.email !== req.params.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      try {
        const email = req.params.email;
        const foodRequests = await foodRequestCollection
          .find({ email })
          .toArray();
        res.status(200).json(foodRequests);
      } catch (error) {
        console.error("Error fetching food requests:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // my list delete
    app.delete("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.deleteOne(query);
      res.send(result);
    });

    // update code
    app.get("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await foodCollection.findOne(query);
      res.send(result);
    });

    // update put
    app.put("/foods/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedFoods = req.body;

      const foods = {
        $set: {
          photo: updatedFoods.photo,
          status: updatedFoods.status,
          name: updatedFoods.name,
          quantity: updatedFoods.quantity,
          location: updatedFoods.location,
          date: updatedFoods.date,
          notes: updatedFoods.notes,
        },
      };
      const result = await foodCollection.updateOne(filter, foods, options);
      res.send(result);
    });




    // Route to fetch featured foods sorted by quantity
    app.get("/featured-foods", async (req, res) => {
      try {
        const featuredFoods = await foodCollection
          .find()
          .sort({ quantity: -1 })
          .limit(6)
          .toArray();
        res.json(featuredFoods);
      } catch (error) {
        console.error("Error fetching featured foods:", error);
        res.status(500).json({ error: "Internal server error" });
      }
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
