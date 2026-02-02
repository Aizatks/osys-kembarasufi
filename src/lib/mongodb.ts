import { MongoClient, Db, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'kembara_sufi';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export interface Staff {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'staff' | 'superadmin';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface Customer {
  _id?: ObjectId;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuotationRecord {
  _id?: ObjectId;
  quotationNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  packageName: string;
  travelDate: string;
  pax: {
    adult: number;
    cwb: number;
    cwob: number;
    infant: number;
  };
  totalAmount: number;
  breakdown: {
    basePrice: number;
    surcharge: number;
    tip: number;
    visa: number;
    insurance: number;
    singleRoom: number;
    discount: number;
  };
  status: 'draft' | 'sent' | 'confirmed' | 'cancelled';
  createdBy: ObjectId;
  staffName: string;
  createdAt: Date;
  updatedAt: Date;
  notes?: string;
}

export { ObjectId };
