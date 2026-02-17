"use client"

import { InputWithButton } from "../../components/ui/input-with-button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "../../components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip"
import { ArrowRight, Info } from "lucide-react"
import { useState, useEffect, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { useLoginPopup } from "@/components/login-popup"
import { createBrowserClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"

export default function PreferencesPage() {
  const { openLogin } = useLoginPopup()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return
    const supabase = createBrowserClient(url, key)
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  const initialText = "https://www.rightmove.co.uk/properties/..."
  const [value, setValue] = useState<string>(initialText)
  const [showPreferences, setShowPreferences] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [location, setLocation] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Select state variables
  const [bedrooms, setBedrooms] = useState<string>('')
  const [bathrooms, setBathrooms] = useState<string>('')
  const [propertyType, setPropertyType] = useState<string>('')
  const [size, setSize] = useState<string>('')
  
  // Slider state variables
  const [bedroomsSlider, setBedroomsSlider] = useState(50)
  const [bathroomsSlider, setBathroomsSlider] = useState(50)
  const [propertyTypeSlider, setPropertyTypeSlider] = useState(50)
  const [sizeSlider, setSizeSlider] = useState(50)
  const [gardenSlider, setGardenSlider] = useState(50)
  const [parkingSlider, setParkingSlider] = useState(50)
  const [locationSlider, setLocationSlider] = useState(50)
  const [garageSlider, setGarageSlider] = useState(50)
  
  const router = useRouter()

  const handleGenerateReport = async () => {
    if (!user) {
      openLogin()
      return
    }
    if (!value || value === initialText || value.trim() === '') {
      alert('Please enter a valid Rightmove URL')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/scrape-property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: value.trim(),
          postcode: location.trim() || null,
          preferences: {
            bedrooms: bedroomsSlider,
            bathrooms: bathroomsSlider,
            propertyType: propertyTypeSlider,
            size: sizeSlider,
            garden: gardenSlider,
            parking: parkingSlider,
            location: locationSlider,
            garage: garageSlider
          }
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to scrape property')
      }

      const data = await response.json()
      
      // Navigate to results page with data in URL state
      const params = new URLSearchParams()
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'priceHistory' && value !== null) {
          // Stringify array for URL param
          params.append(key, JSON.stringify(value))
        } else if (key === 'nearbyPlaces' && value !== null) {
          // Stringify object for URL param
          params.append(key, JSON.stringify(value))
        } else if (key === 'averagePriceByYear' && value !== null) {
          params.append(key, JSON.stringify(value))
        } else if (value === null) {
          // Handle null values by stringifying them
          params.append(key, 'null')
        } else {
          params.append(key, String(value))
        }
      })
      params.append('preferredBedroomsScore', String(bedroomsSlider))
      params.append('preferredBathroomsScore', String(bathroomsSlider))
      params.append('preferredPropertyTypeScore', String(propertyTypeSlider))
      params.append('preferredSizeScore', String(sizeSlider))
      params.append('preferredGardenScore', String(gardenSlider))
      params.append('preferredParkingScore', String(parkingSlider))
      params.append('preferredLocationScore', String(locationSlider))
      params.append('preferredGarageScore', String(garageSlider))
      // Add actual user selections
      if (bedrooms) params.append('userBedrooms', bedrooms)
      if (bathrooms) params.append('userBathrooms', bathrooms)
      if (propertyType) params.append('userPropertyType', propertyType)
      if (size) params.append('userSize', size)
      // Add preferred postcode
      if (location && location.trim()) params.append('preferredPostcode', location.trim())
      router.push(`/results?${params.toString()}`)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
      setIsLoading(false)
    }
  }
  return (
    <div className="min-h-screen bg-white" style={{ backgroundColor: '#FFFFFF' }}>
      <Navbar isScrolled={isScrolled} />
      <div className="container mx-auto px-4 sm:px-6 min-h-[70vh] flex flex-col items-center justify-center gap-6">
        <div
          className="flex flex-col items-center gap-6 w-full"
          style={{
            transform: showPreferences ? 'translateY(-160%)' : 'translateY(0)',
            transition: 'transform 400ms ease'
          }}
        >
        <h1 className="text-center w-full px-4 md:max-w-[39.2%] md:w-[39.2%] md:px-0 text-base sm:text-lg md:text-xl" style={{ color: '#000000', fontWeight: 'normal', marginBottom: '1.65rem', marginLeft: 'auto', marginRight: 'auto', display: 'block' }}>
          Enter the Rightmove link you're interested in
        </h1>

          <div className="w-full max-w-4xl mx-auto px-4 md:px-0 md:w-1/2">
            <InputWithButton
              type="text"
              placeholder="https://www.rightmove.co.uk/properties/..."
              value={value}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                const inputValue = e.target.value
                setValue(inputValue)
                
                // Validate if it's a rightmove link
                if (inputValue && inputValue !== initialText) {
                  const rightmovePattern = /^https?:\/\/(www\.)?rightmove\.co\.uk\/properties\/.*/i
                  if (!rightmovePattern.test(inputValue)) {
                    setError('Please enter a valid Rightmove link')
                  } else {
                    setError('')
                  }
                } else {
                  setError('')
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !error && value && value !== initialText) {
                  e.preventDefault()
                  setShowPreferences(true)
                }
              }}
              onFocus={() => {
                if (value === initialText) setValue("")
              }}
              onButtonClick={() => {
                if (!error && value && value !== initialText) {
                  setShowPreferences(true)
                }
              }}
              buttonDisabled={!!error || !value || value === initialText}
              className="rounded-full bg-white focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 py-0 leading-[46.08px]"
              style={{ width: '100%', height: '46.08px', paddingRight: '56px', fontSize: '1.1rem', textIndent: '4%', border: '1px solid rgba(0, 0, 0, 0.2)', color: value === initialText ? 'rgba(0, 0, 0, 0.8)' : '#000000' }}
            />
            {error && (
              <p className="text-sm mt-2 text-center font-black" style={{ fontWeight: 900, color: '#000000' }}>
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {showPreferences && (
        <section className="container mx-auto px-4 sm:px-6 py-8 md:py-12" style={{ marginTop: '-160px' }}>
          <div className="border border-gray-300 rounded-lg p-4 sm:p-6 md:p-8 mx-auto w-full max-w-full md:max-w-[85%] md:w-[85%]" style={{ borderRadius: '0.505rem', border: '1px solid #d1d5db', backgroundColor: '#CFDEE7' }}>
            <h2 className="text-xl md:text-2xl font-semibold mb-6 text-left px-1" style={{ color: '#000000' }}>
              Set your preferences
            </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-[1.092rem] max-w-full lg:max-w-[94.248%] mx-auto">
            <div>
              <Select value={bedrooms} onValueChange={setBedrooms}>
                <SelectTrigger className="w-full bg-white text-black border-black rounded-lg font-bold" style={{ borderRadius: '0.5rem', fontWeight: '700', backgroundColor: '#ffffff', color: '#000000' }}>
                  <SelectValue placeholder="Number of bedrooms" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-black border-gray-700" side="top" style={{ backgroundColor: '#92B4F4', color: '#000000' }}>
                  <SelectGroup>
                    <SelectItem value="1" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>1</SelectItem>
                    <SelectItem value="2" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>2</SelectItem>
                    <SelectItem value="3" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>3</SelectItem>
                    <SelectItem value="4" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>4</SelectItem>
                    <SelectItem value="5" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>5</SelectItem>
                    <SelectItem value="6+" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>6+</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <label className="mt-4 block text-black" style={{ color: '#000000', fontSize: '0.86821875rem', paddingLeft: '0', paddingRight: '0' }}>
                Preference strength: {bedroomsSlider}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={bedroomsSlider}
                onChange={(event) => setBedroomsSlider(Number(event.target.value))}
                className="w-full accent-black"
                style={{ accentColor: '#0A369D', paddingLeft: '0', paddingRight: '0', marginLeft: '0', marginRight: '0' }}
              />
            </div>

            <div>
              <Select value={bathrooms} onValueChange={setBathrooms}>
                <SelectTrigger className="w-full bg-white text-black border-black rounded-lg font-bold" style={{ borderRadius: '0.5rem', fontWeight: '700', backgroundColor: '#ffffff', color: '#000000' }}>
                  <SelectValue placeholder="Number of bathrooms" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-black border-gray-700" side="top" style={{ backgroundColor: '#92B4F4', color: '#000000' }}>
                  <SelectGroup>
                    <SelectItem value="1" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>1</SelectItem>
                    <SelectItem value="2" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>2</SelectItem>
                    <SelectItem value="3" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>3</SelectItem>
                    <SelectItem value="4+" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>4+</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <label className="mt-4 block text-black" style={{ color: '#000000', fontSize: '0.86821875rem', paddingLeft: '0', paddingRight: '0' }}>
                Preference strength: {bathroomsSlider}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={bathroomsSlider}
                onChange={(event) => setBathroomsSlider(Number(event.target.value))}
                className="w-full accent-black"
                style={{ accentColor: '#0A369D', paddingLeft: '0', paddingRight: '0', marginLeft: '0', marginRight: '0' }}
              />
            </div>

            <div>
              <Select value={propertyType} onValueChange={setPropertyType}>
                <SelectTrigger className="w-full bg-white text-black border-black rounded-lg font-bold" style={{ borderRadius: '0.5rem', fontWeight: '700', backgroundColor: '#ffffff', color: '#000000' }}>
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-black border-gray-700" side="top" style={{ backgroundColor: '#92B4F4', color: '#000000' }}>
                  <SelectGroup>
                    <SelectItem value="detached" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>Detached</SelectItem>
                    <SelectItem value="semi-detached" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>Semi Detached</SelectItem>
                    <SelectItem value="terraced" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>Terraced</SelectItem>
                    <SelectItem value="flat" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>Flat</SelectItem>
                    <SelectItem value="bungalow" className="font-bold text-black" style={{ fontWeight: '700', color: '#000000' }}>Bungalow</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <label className="mt-4 block text-black" style={{ color: '#000000', fontSize: '0.86821875rem', paddingLeft: '0', paddingRight: '0' }}>
                Preference strength: {propertyTypeSlider}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={propertyTypeSlider}
                onChange={(event) => setPropertyTypeSlider(Number(event.target.value))}
                className="w-full accent-black"
                style={{ accentColor: '#0A369D', paddingLeft: '0', paddingRight: '0', marginLeft: '0', marginRight: '0' }}
              />
            </div>

            <div>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className="w-full bg-white text-black border-black data-[placeholder]:text-black [&>span]:text-black rounded-lg font-bold" style={{ borderRadius: '0.5rem', fontWeight: '700', backgroundColor: '#ffffff', color: '#000000' }}>
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-black border-gray-700" side="top" style={{ backgroundColor: '#92B4F4', color: '#000000' }}>
                  <SelectGroup>
                    <SelectItem 
                      value="50-70" 
                      className="text-black data-[highlighted]:text-black data-[state=checked]:text-black font-bold"
                      style={{ fontWeight: '700', color: '#000000' }}
                    >
                      50-70 sqm
                    </SelectItem>
                    <SelectItem 
                      value="71-90" 
                      className="text-black data-[highlighted]:text-black data-[state=checked]:text-black font-bold"
                      style={{ fontWeight: '700', color: '#000000' }}
                    >
                      71-90 sqm
                    </SelectItem>
                    <SelectItem 
                      value="91-105" 
                      className="text-black data-[highlighted]:text-black data-[state=checked]:text-black font-bold"
                      style={{ fontWeight: '700', color: '#000000' }}
                    >
                      91-105 sqm
                    </SelectItem>
                    <SelectItem 
                      value="106-120" 
                      className="text-black data-[highlighted]:text-black data-[state=checked]:text-black font-bold"
                      style={{ fontWeight: '700', color: '#000000' }}
                    >
                      106-120 sqm
                    </SelectItem>
                    <SelectItem 
                      value="121-140" 
                      className="text-black data-[highlighted]:text-black data-[state=checked]:text-black font-bold"
                      style={{ fontWeight: '700', color: '#000000' }}
                    >
                      121-140 sqm
                    </SelectItem>
                    <SelectItem 
                      value="141-170" 
                      className="text-black data-[highlighted]:text-black data-[state=checked]:text-black font-bold"
                      style={{ fontWeight: '700', color: '#000000' }}
                    >
                      141-170 sqm
                    </SelectItem>
                    <SelectItem 
                      value="171+" 
                      className="text-black data-[highlighted]:text-black data-[state=checked]:text-black font-bold"
                      style={{ fontWeight: '700', color: '#000000' }}
                    >
                      171+ sqm
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <label className="mt-4 block text-black" style={{ color: '#000000', fontSize: '0.86821875rem', paddingLeft: '0', paddingRight: '0' }}>
                Preference strength: {sizeSlider}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={sizeSlider}
                onChange={(event) => setSizeSlider(Number(event.target.value))}
                className="w-full accent-black"
                style={{ accentColor: '#0A369D', paddingLeft: '0', paddingRight: '0', marginLeft: '0', marginRight: '0' }}
              />
            </div>
          </div>

          <div className="mt-6 md:mt-[30px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-[1.092rem] max-w-full lg:max-w-[94.248%] mx-auto">
            <div>
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <input
                      type="text"
                      placeholder="Location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full h-10 bg-white text-black border border-black rounded-lg px-3 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      style={{ color: '#000000', borderRadius: '0.5rem', textIndent: '0.5rem', fontWeight: '700', paddingRight: '0.75rem', boxSizing: 'border-box', borderWidth: '1px' }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter your ideal post code</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <label className="mt-4 block text-black" style={{ color: '#000000', fontSize: '0.86821875rem', paddingLeft: '0', paddingRight: '0' }}>
                Preference strength: {locationSlider}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={locationSlider}
                onChange={(event) => setLocationSlider(Number(event.target.value))}
                className="w-full accent-black"
                style={{ accentColor: '#0A369D', paddingLeft: '0', paddingRight: '0', marginLeft: '0', marginRight: '0' }}
              />
            </div>

            <div>
              <div className="flex items-center px-3 py-2 font-bold text-black h-10" style={{ color: '#000000', fontWeight: '700' }}>
                Garden?
              </div>
              <label className="mt-4 block text-black" style={{ color: '#000000', fontSize: '0.86821875rem', paddingLeft: '0', paddingRight: '0' }}>
                Preference strength: {gardenSlider}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={gardenSlider}
                onChange={(event) => setGardenSlider(Number(event.target.value))}
                className="w-full accent-black"
                style={{ accentColor: '#0A369D', paddingLeft: '0', paddingRight: '0', marginLeft: '0', marginRight: '0' }}
              />
            </div>

            <div>
              <div className="flex items-center px-3 py-2 font-bold text-black h-10" style={{ color: '#000000', fontWeight: '700' }}>
                Parking?
              </div>
              <label className="mt-4 block text-black" style={{ color: '#000000', fontSize: '0.86821875rem', paddingLeft: '0', paddingRight: '0' }}>
                Preference strength: {parkingSlider}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={parkingSlider}
                onChange={(event) => setParkingSlider(Number(event.target.value))}
                className="w-full accent-black"
                style={{ accentColor: '#0A369D', paddingLeft: '0', paddingRight: '0', marginLeft: '0', marginRight: '0' }}
              />
            </div>

            <div>
              <div className="flex items-center px-3 py-2 font-bold text-black h-10" style={{ color: '#000000', fontWeight: '700' }}>
                Garage?
              </div>
              <label className="mt-4 block text-black" style={{ color: '#000000', fontSize: '0.86821875rem', paddingLeft: '0', paddingRight: '0' }}>
                Preference strength: {garageSlider}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={garageSlider}
                onChange={(event) => setGarageSlider(Number(event.target.value))}
                className="w-full accent-black"
                style={{ accentColor: '#0A369D', paddingLeft: '0', paddingRight: '0', marginLeft: '0', marginRight: '0' }}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-center px-2" style={{ marginTop: '5vh' }}>
            <Button 
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="text-white border disabled:opacity-50 rounded-lg w-full sm:w-auto sm:scale-[1.521]" 
              style={{ fontWeight: '600', borderRadius: '0.5rem', color: '#ffffff', backgroundColor: '#0A369D', borderColor: '#0A369D' }}
            >
              {isLoading ? 'Generating Report...' : 'Generate Report'}
            </Button>
          </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}