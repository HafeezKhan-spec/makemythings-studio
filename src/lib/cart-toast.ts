import { toast } from "sonner";

/** Bottom toast with a View Cart action after adding an item. */
export function showAddedToCartToast(productName: string, onViewCart: () => void) {
  toast.success(`${productName} added to cart`, {
    action: {
      label: "View Cart",
      onClick: onViewCart,
    },
    duration: 5000,
  });
}
