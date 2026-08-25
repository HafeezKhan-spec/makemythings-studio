import { connectMongo } from "@/integrations/mongodb/connect.server";
import { Order, Product, Review } from "@/integrations/mongodb/models";

export async function recalculateProductRatings(productId: string) {
  await connectMongo();
  const reviews = await Review.find({ productId, isApproved: true }).lean();
  const count = reviews.length;
  const rating =
    count === 0
      ? 0
      : Number(
          (reviews.reduce((sum, row) => sum + Number(row.rating), 0) / count).toFixed(1),
        );
  await Product.updateOne({ _id: productId }, { rating, reviewCount: count });
  return { rating, reviewCount: count };
}

export async function userPurchasedProduct(userId: string, productId: string) {
  await connectMongo();
  const paidOrder = await Order.findOne({
    userId,
    paymentStatus: "paid",
    "items.productId": productId,
  }).lean();
  return Boolean(paidOrder);
}
