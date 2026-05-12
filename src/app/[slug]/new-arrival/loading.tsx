/**
 * Loading UI for `/[slug]/new-arrival`. Reuses the Shop tab's
 * skeleton chassis but without the big "Shop" hero heading and with
 * just one product-grid section (new arrivals). The section title
 * placeholder represents the "New Arrivals" h3 header.
 */

import { ShopSurfaceSkeleton } from "../shop/loading";

export default function NewArrivalLoading() {
  return <ShopSurfaceSkeleton withHeader={false} sectionCount={1} />;
}
