import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "trading_dashboard")

client: AsyncIOMotorClient = None
db = None


async def init_db():
    global client, db
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DB]

    # Create default wallet if none exists
    wallet = await db.wallet.find_one()
    if not wallet:
        await db.wallet.insert_one({
            "initial_balance": 1000000.0,
            "cash_balance": 1000000.0,
        })
        logger.info("Default wallet created with Rs 10,00,000")

    # Create indexes
    await db.orders.create_index("symbol")
    await db.orders.create_index("status")
    await db.orders.create_index([("created_at", -1)])
    await db.positions.create_index("symbol", unique=True)
    await db.alerts.create_index("symbol")
    await db.watchlist.create_index("symbol", unique=True)
    await db.predictions.create_index([("symbol", 1), ("date", 1)], unique=True)
    await db.predictions.create_index([("predicted_at", -1)])
    await db.price_snapshots.create_index([("symbol", 1), ("date", 1)], unique=True)

    logger.info(f"MongoDB connected: {MONGODB_DB}")


async def close_db():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed")


def get_db():
    return db
