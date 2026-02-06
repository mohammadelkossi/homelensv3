
"use client"

import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { ComparisonTable } from "@/components/comparison-table"
import Link from "next/link"
import { useState } from "react"
import { Award, BarChart3, Calculator, Calendar, ChevronDown, ChevronUp, Heart, LineChart, Map, MapPin, PoundSterling, Star, TrendingUp } from "lucide-react"

export default function Home() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index)
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="relative overflow-hidden" style={{ minHeight: '100vh' }}>
        <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
          <video
            className="w-full h-full object-cover"
            src="/background.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-white/65" />
        </div>
        <div className="relative" style={{ zIndex: 50 }}>
          <Navbar />
        </div>
        <div className="relative z-10 flex items-center justify-start min-h-screen" style={{ paddingTop: '0%', paddingLeft: '9.71%', marginTop: '-9.45%' }}>
          <div className="text-left flex flex-col items-start">
            <h1 className="hero-title font-bold leading-tight" style={{ color: '#000000', fontSize: '5.5rem', lineHeight: '1', marginTop: '-2%', textAlign: 'left' }}>
              Say Hello to<br />
              your Dream Home
            </h1>
            <p className="max-w-2xl" style={{ color: '#000000', fontSize: '1.46rem', marginTop: '25.92px', textAlign: 'left', fontFamily: "'Britti Sans', sans-serif" }}>
              Skip the guesswork. Get personalised insights based on your choices
            </p>
            <div className="mt-8 flex justify-start">
              <Link href="/preferences">
                <Button style={{ padding: '12px 32px', fontSize: '18px', borderRadius: '8px', backgroundColor: '#0A369D', color: 'white', border: 'none', cursor: 'pointer' }}>
                  Get Started for Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <section style={{ backgroundColor: '#0A369D', marginTop: '-210px' }}>
        <div className="container mx-auto px-6" style={{ paddingTop: '21.168rem', paddingBottom: '5rem', minHeight: '70.56vh', height: 'auto' }}>
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center font-britti" style={{ marginTop: '-5%' }}>How it works</h2>
          <p className="mt-4 text-lg text-white/90 text-center max-w-3xl mx-auto">
            Get started in three simple steps
          </p>

          <div className="mt-12 flex flex-row flex-wrap items-start justify-center gap-[9.009rem]">
            {[
              {
                icon: <Calculator style={{ width: '48px', height: '48px' }} />,
                title: "Share your preferences",
                description: "Tell us everything that matters to you in your dream home.",
              },
              {
                icon: <TrendingUp style={{ width: '48px', height: '48px' }} />,
                title: "Analyse any property",
                description: "Enter the Rightmove URL for the home you are considering.",
              },
              {
                icon: <Star style={{ width: '48px', height: '48px' }} />,
                title: "Make informed decisions",
                description: "We show how well each home fits your goals—and if the price stacks up.",
              },
            ].map((step) => (
              <div key={step.title} className="flex flex-col items-center text-center gap-5" style={{ width: '260px' }}>
                <div
                  className="rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(61, 164, 164, 0.25)', width: '90px', height: '90px' }}
                >
                  <span className="text-white">
                    {step.icon}
                  </span>
                  </div>
                <h3 className="text-2xl font-semibold text-white" style={step.title === "Make informed decisions" ? { whiteSpace: 'nowrap' } : {}}>{step.title}</h3>
                <p className="text-base text-white/85 max-w-xs">{step.description}</p>
              </div>
            ))}
                  </div>
              </div>
      </section>

      <section style={{ backgroundColor: '#FFFFFF' }}>
        <div className="container mx-auto px-6 py-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center" style={{ color: '#160F29' }}>What&apos;s included</h2>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 md:gap-10">
            {[
              {
                icon: MapPin,
                heading: 'Full Address',
                subheading: 'View complete property address including house number & full post code',
              },
              {
                icon: PoundSterling,
                heading: 'Property Price Value',
                subheading: 'Compare property price per square metre against the area & property type average',
              },
              {
                icon: Calendar,
                heading: 'Date Posted',
                subheading: 'Reveal real property list date rather than when property was reduced',
              },
              {
                icon: TrendingUp,
                heading: 'Area Price Trends',
                subheading: 'Track area sold price trends over the past 5 years',
              },
              {
                icon: BarChart3,
                heading: 'Area Supply & Demand',
                subheading: 'See how many properties within the post code have been sold over the past year to gauge supply & demand',
              },
              {
                icon: LineChart,
                heading: 'Property Historic Growth',
                subheading: 'Review past sale prices to understand the property\'s long-term value potential',
              },
              {
                icon: Heart,
                heading: 'Personalised Preferences',
                subheading: 'Score properties based on your non-negotiables including criteria such as number of bathrooms, garden, parking & garage etc',
              },
              {
                icon: Map,
                heading: 'Amenities',
                subheading: 'Explore nearby schools, transport, shops, gyms, and green spaces that affect daily living.',
              },
              {
                icon: Award,
                heading: 'Overall Score',
                subheading: 'A single Homelens score that incorporates all the above',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="flex items-center justify-center w-14 h-14 rounded-full mb-4"
                  style={{ backgroundColor: '#0A369D' }}
                >
                  <item.icon className="w-7 h-7 text-white" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-semibold" style={{ color: '#160F29' }}>
                  {item.heading}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: '#246A73' }}>
                  {item.subheading}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      <section style={{ backgroundColor: '#4472CA' }}>
        <div
          className="container mx-auto px-6"
          style={{ paddingTop: '4.608rem', paddingBottom: '9.6rem', minHeight: '32vh' }}
        >
          <ComparisonTable />
        </div>
      </section>

      <section style={{ backgroundColor: '#CFDEE7' }}>
        <div className="container mx-auto px-6 py-22 text-center" style={{ paddingTop: '22rem', paddingBottom: '7.92rem' }}>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: '#160F29', marginTop: '-20%' }}>
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg md:text-xl" style={{ color: '#000000' }}>
            Everything you need to know about HomeLens
          </p>
          
          <div className="mt-12 max-w-3xl mx-auto text-left">
            {[
              {
                question: 'How does HomeLens work?',
                answer: "Simply paste a Rightmove property link into our platform & tell us your personal preferences for your new home. We'll pull the data and analyse it against both the market (price per square metre, local growth rates etc) and your personal preferences. You then get a clear score for how closely that property matches your needs."
              },
              {
                question: 'What can I do with my score?',
                answer: "The analysis is meant for a) comparison between different properties, b) to provide an insight into a property's value & c) as leverage for negotiation with the property seller"
              },
              {
                question: 'What data sources do you use?',
                answer: 'We use live data from Rightmove as well as historical data from the Land Registry. This means your analysis is always based on the most recent, accurate information available.'
              },
              {
                question: 'How accurate are your property scores?',
                answer: 'Our Investment Score uses official government data and real market prices. The Personal Fit score uses AI to match property descriptions against your specific requirements. While no tool can predict the future, our data sources are the same ones used by professional property analysts.'
              },
              {
                question: 'How much does HomeLens cost?',
                answer: "5 properties are analysed free of charge every month, beyond this the cost is £5/month - this is to cover the heavy processing costs associated with producing reports"
              },
              {
                question: 'What if the information is not publicly available?',
                answer: 'If any information is not publicly available then it will be explicitly mentioned within the report and that criteria will not be included within the analysis'
              },
              {
                question: 'How quickly do I get my report?',
                answer: 'Reports generate instantly. As soon as you paste a property link, our system pulls the data and creates your personalised analysis. No waiting days or weeks like traditional property reports.'
              },
              {
                question: 'Can I analyse any property on Rightmove?',
                answer: "Yes, as long as it's an active Rightmove listing with sufficient data. Our system works with houses, flats, new builds, and period properties across England and Wales."
              },
              {
                question: 'Is HomeLens a replacement for a survey or solicitor?',
                answer: 'No. HomeLens helps you decide which properties are worth pursuing before you spend money on surveys, legal fees, or even viewings. Think of us as your pre-purchase filter, not a replacement for professional property services.'
              },
              {
                question: 'Can I share reports with my partner or estate agent?',
                answer: 'Yes. Every report includes a shareable link so you can easily discuss findings with family, friends, or your estate agent.'
              },
              {
                question: 'What if a property I analysed gets reduced in price?',
                answer: "Great question! Property prices change frequently. If you've analysed a property and the price drops, simply re-run the analysis with the updated link. Your Personal Fit score stays the same, but the Investment Score will update to reflect the new pricing."
              }
            ].map((faq, index) => (
              <div
                key={index}
                className="mb-3 rounded-lg cursor-pointer transition-colors"
                style={{
                  backgroundColor: '#4472CA',
                  padding: '1rem 1.5rem',
                }}
                onClick={() => toggleFAQ(index)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold" style={{ color: '#160F29' }}>
                    {faq.question}
                  </h3>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform ${openFAQ === index ? 'transform rotate-180' : ''}`}
                    style={{ color: '#160F29' }}
                  />
                </div>
                {openFAQ === index && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: '#3A5FA8' }}>
                    <p className="text-base" style={{ color: '#160F29' }}>
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* CTA Bubble */}
          <div className="mt-16 mx-auto" style={{ maxWidth: '1397.76px' }}>
            <div
              className="rounded-2xl px-8 py-12 text-center"
              style={{
                backgroundColor: '#0A369D',
                borderRadius: '1.5rem',
              }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#FFFFFF' }}>
                Start your property analysis with HomeLens today!
              </h2>
              <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto" style={{ color: '#FFFFFF' }}>
                Get professional property analysis delivered at startup speed.<br />
                Skip the manual research and make informed investment decisions.
              </p>
              <Link href="/preferences">
                <Button
                  className="px-8 py-3 text-lg font-semibold rounded-lg"
                  style={{
                    backgroundColor: '#CFDEE7',
                    color: '#000000',
                    border: 'none',
                  }}
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
      </div>
      </section>
      
      <Footer />
    </div>
  );
}
