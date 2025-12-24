import { Tab } from "@/components/ui/tab";

export const PricingHeader = ({
  title,
  subtitle,
  frequencies,
  selectedFrequency,
  onFrequencyChange,
}: {
  title: string;
  subtitle: string;
  frequencies: string[];
  selectedFrequency: string;
  onFrequencyChange: (frequency: string) => void;
}) => (
  <div className="space-y-7 text-center">
    <div className="space-y-4">
      <h1 className="text-4xl font-medium md:text-5xl text-black" style={{ color: '#000000' }}>{title}</h1>
      <p className="text-gray-600" style={{ color: '#000000' }}>{subtitle}</p>
    </div>
    <div className="mx-auto flex w-fit rounded-full bg-[#F3F4F6] p-1">
      {frequencies.map((freq) => (
        <Tab
          key={freq}
          text={freq}
          selected={selectedFrequency === freq}
          setSelected={onFrequencyChange}
          discount={freq === "yearly"}
        />
      ))}
    </div>
  </div>
);

