const express = require('express');
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config()

const uri = process.env.MONGODB_URI;
const app = express()
const PORT = process.env.PORT || 5000;
app.use(cors())
app.use(express.json())

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();

    const db = client.db("drivefleet");
    const addCarCollection =  db.collection("add-Car");

    app.get('/explore-cars', async (req, res) => {
      const result = await addCarCollection.find().toArray();
      res.json(result);
    })

    app.post('/add-car', async (req, res) => {
      const addCarData = req.body;
      console.log(addCarData);
      const result = await addCarCollection.insertOne(addCarData);
      res.send(result);
    })

    // ১. বুকিং ডাটাবেজে সেভ করার এপিআই
app.post('/bookings', async (req, res) => {
  try {
    const bookingData = req.body;
    // 'bookings' নামে একটি নতুন কালেকশন তৈরি হবে মঙ্গোডিবিতে
    const result = await client.db("drivefleet").collection("bookings").insertOne(bookingData);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Booking failed to save" });
  }
});

// ২. সব বুকিং গেট করার এপিআই (যাতে My Bookings পেজে দেখানো যায়)
app.get('/bookings', async (req, res) => {
  try {
    const result = await client.db("drivefleet").collection("bookings").find().toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

    app.get('/explore-cars/:id', async (req, res) => {
      const { id } = req.params;
      const result = await addCarCollection.findOne({_id: new ObjectId(id)});
      res.json(result);
    })




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})