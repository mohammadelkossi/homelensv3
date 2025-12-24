import { TIERS } from "@/config/pricing";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NumberFlow from "@number-flow/react";
import { ArrowRight, BadgeCheck } from "lucide-react";

export const PricingCard = ({
  tier,
  paymentFrequency,
}: {
  tier: (typeof TIERS)[0];
  paymentFrequency: string;
}) => {
  const price = tier.price[paymentFrequency];
  const isHighlighted = tier.highlighted;
  const isPopular = tier.popular;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-8 overflow-hidden rounded-2xl border p-6 shadow",
        isHighlighted
          ? "bg-gray-100 text-black border-gray-300"
          : "bg-white text-black border-gray-200",
        isPopular && "outline outline-[rgba(120,119,198)]",
      )}
    >
      {/* Background Decoration */}
      {isHighlighted && <HighlightedBackground />}
      {isPopular && <PopularBackground />}

      {/* Card Header */}
      <h2 className="flex items-center gap-3 text-xl font-medium capitalize" style={{ color: '#000000' }}>
        {tier.name}
        {isPopular && (
          <Badge className="mt-1 bg-orange-600 px-2 py-0.5 text-xs text-white hover:bg-orange-600">
            🔥 Most Popular
          </Badge>
        )}
      </h2>

      {/* Price Section */}
      <div className="relative h-12">
        {typeof price === "number" ? (
          <>
            <NumberFlow
              format={{
                style: "currency",
                currency: "USD",
                trailingZeroDisplay: "stripIfInteger",
              }}
              value={price}
              className="text-4xl font-medium"
              style={{ color: '#000000' }}
            />
            <p className="-mt-2 text-xs font-medium" style={{ color: '#000000' }}>Per month/user</p>
          </>
        ) : (
          <h1 className="text-4xl font-medium" style={{ color: '#000000' }}>{price}</h1>
        )}
      </div>

      {/* Features */}
      <div className="flex-1 space-y-2">
        <h3 className={cn("text-sm font-medium", isHighlighted ? "text-gray-600" : "text-gray-600")} style={{ color: '#000000' }}>{tier.description}</h3>
        <ul className="space-y-2">
          {tier.features.map((feature, index) => (
            <li
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                isHighlighted ? "text-gray-700" : "text-gray-600",
              )}
              style={{ color: '#000000' }}
            >
              <BadgeCheck strokeWidth={1} size={16} />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Call to Action Button */}
      <Button
        variant="expandIcon"
        Icon={ArrowRight}
        iconPlacement="right"
        className={cn(
          "h-fit w-full rounded-lg bg-black text-white hover:bg-gray-800",
          isHighlighted && "bg-black text-white hover:bg-gray-800",
        )}
      >
        {tier.cta}
      </Button>
    </div>
  );
};

// Highlighted Background Component
const HighlightedBackground = () => (
  <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:45px_45px] opacity-100 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] dark:opacity-30" />
);

// Popular Background Component
const PopularBackground = () => (
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.1),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
);

