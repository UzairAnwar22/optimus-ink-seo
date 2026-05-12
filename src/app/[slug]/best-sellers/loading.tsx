/**
 * Loading UI for `/[slug]/best-sellers`. Reuses the Shop tab's
 * skeleton chassis but without the big "Shop" hero heading and with
 * just one product-grid section (best sellers, no new arrivals). The
 * section title placeholder represents the "Best Sellers" h3 header.
 */

import { ShopSurfaceSkeleton } from "../shop/loading";

export default function BestSellersLoading() {
  return <ShopSurfaceSkeleton withHeader={false} sectionCount={1} />;
}
