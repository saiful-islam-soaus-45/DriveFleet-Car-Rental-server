const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();

const uri = process.env.MONGODB_URI;
const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

const verifyToken = async (req, res, next) => {
  const authHeader =req?.headers.authorization
  if(!authHeader) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const token = authHeader.split(" ")[1]
  if(!token) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  console.log(authHeader);

  try {
    const {payload} =await jwtVerify(token, JWKS)
  console.log(payload);
   next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" })
    
  }
 
};

async function run() {
  try {
    // await client.connect();

    const db = client.db("drivefleet");
    const addCarCollection = db.collection("add-Car");
    const bookingsCollection = db.collection("bookings");

    app.get("/explore-cars", async (req, res) => {
  try {
    const { search, type, email } = req.query;

    let query = {};

    if (email) {
      query.email = email;
    }

    if (search) {
      query.carName = {
        $regex: search,
        $options: "i",
      };
    }

    if (type && type !== "all") {
      query.carType = {
        $regex: `^${type}$`,
        $options: "i",
      };
    }

    const result = await addCarCollection.find(query).toArray();

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to fetch cars" });
  }
});

    app.get("/my-cars", async (req, res) => {
      try {
        const userEmail = req.query.email;
        let query = {};
        if (userEmail) {
          query = { email: userEmail };
        }
        const result = await addCarCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch my cars" });
      }
    });

    app.post("/add-car", verifyToken, async (req, res) => {
      try {
        const addCarData = req.body;

        if (addCarData.booking_count === undefined) {
          addCarData.booking_count = 0;
        }

        console.log("Saving car data:", addCarData);
        const result = await addCarCollection.insertOne(addCarData);
        res.status(201).json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to insert car data" });
      }
    });

    app.post("/bookings", verifyToken, async (req, res) => {
      try {
        const bookingData = req.body;

        const result = await bookingsCollection.insertOne(bookingData);

        const bookedCarId = bookingData.carId;

        if (bookedCarId) {
          await addCarCollection.updateOne(
            { _id: new ObjectId(bookedCarId) },
            { $inc: { booking_count: 1 } },
          );
        }

        res.status(201).json(result);
      } catch (error) {
        res
          .status(500)
          .json({ error: "Booking failed to save and increment count" });
      }
    });

    app.get("/bookings", verifyToken, async (req, res) => {
      try {
        const userEmail = req.query.email;
        let query = {};

        if (userEmail) {
          query = { email: userEmail };
        }

        const result = await bookingsCollection.find(query).toArray();
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch bookings" });
      }
    });

    app.get(
      "/explore-cars/:id", verifyToken,
      async (req, res) => {
        try {
          const { id } = req.params;
          const result = await addCarCollection.findOne({
            _id: new ObjectId(id),
          });
          res.json(result);
        } catch (error) {
          res.status(500).json({ error: "Failed to fetch car details" });
        }
      },
    );

    app.put("/explore-cars/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const updatedData = req.body;

        const { _id, ...updateFields } = updatedData;

        const result = await addCarCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields },
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to update car data" });
      }
    });

    app.delete("/explore-cars/:id", verifyToken, async (req, res) => {
      try {
        const { id } = req.params;
        const result = await addCarCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to delete car" });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("DriveFleet Server is Running!");
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
