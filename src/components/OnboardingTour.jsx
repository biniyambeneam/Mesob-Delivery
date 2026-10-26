import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  Clock3,
  Coffee,
  Flame,
  MapPin,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Utensils,
} from 'lucide-react';
import LanguageToggle from './LanguageToggle.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

// Slide 0: CSS Burger & Food Artwork
function FoodArt() {
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Central Accent Disk */}
      <div className="cf-inner-disk bg-gradient-to-tr from-[#08795d] to-[#0ba881]">
        {/* CSS Burger Composition */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Top Bun */}
          <div className="w-24 h-12 bg-gradient-to-b from-[#f5b33f] to-[#e59332] rounded-t-full relative shadow-md flex items-center justify-center">
            {/* Sesame seeds */}
            <div className="absolute top-3 left-6 w-1 h-1.5 bg-amber-100 rounded-full rotate-12" />
            <div className="absolute top-2 left-11 w-1.5 h-1 bg-amber-100 rounded-full -rotate-12" />
            <div className="absolute top-4 right-7 w-1 h-1.5 bg-amber-100 rounded-full rotate-45" />
          </div>

          {/* Tomato Layer */}
          <div className="w-[102px] h-2.5 bg-[#df5c3f] rounded-full -mt-0.5 shadow-sm" />

          {/* Cheese Layer */}
          <div className="w-28 h-2 bg-[#f4bd6a] -mt-0.5 relative">
            <div className="absolute -bottom-2 left-4 w-4 h-3 bg-[#f4bd6a] rotate-45" />
          </div>

          {/* Burger Patty */}
          <div className="w-[104px] h-4 bg-[#7a4928] rounded-full -mt-0.5 shadow-inner" />

          {/* Crispy Lettuce */}
          <div className="w-28 h-3 bg-[#35b96a] rounded-full -mt-1 flex justify-around px-2">
            <div className="w-3 h-2 bg-[#2ea25d] rounded-full" />
            <div className="w-3 h-2 bg-[#2ea25d] rounded-full" />
            <div className="w-3 h-2 bg-[#2ea25d] rounded-full" />
          </div>

          {/* Bottom Bun */}
          <div className="w-24 h-6 bg-gradient-to-t from-[#c67623] to-[#e59332] rounded-b-2xl shadow-md -mt-0.5" />
        </div>
      </div>

      {/* Floating Decorative Tiles */}
      <div className="cf-tile -top-2 left-2 rotate-[-8deg]">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#08795d]">
          <Utensils className="w-4 h-4" />
        </div>
      </div>

      <div className="cf-tile top-10 right-2 rotate-[12deg]">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-[#d48431]">
          <Coffee className="w-4 h-4" />
        </div>
      </div>

      <div className="cf-tile -bottom-3 right-6 rotate-[-6deg]">
        <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
          <Flame className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

// Slide 1: CSS Takeaway Bag & Campus Pickup Artwork
function PickupArt() {
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Central Accent Disk */}
      <div className="cf-inner-disk bg-gradient-to-tr from-[#08795d] to-[#129c78]">
        {/* CSS Kraft Takeaway Bag */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Bag Handles */}
          <div className="w-12 h-8 border-4 border-[#c97534] rounded-t-full mb-[-4px]" />

          {/* Bag Body */}
          <div className="w-28 h-32 bg-gradient-to-b from-[#f7b85d] to-[#da753b] rounded-xl shadow-lg relative flex flex-col items-center justify-center p-2">
            {/* Bag fold lines */}
            <div className="absolute top-2 inset-x-2 h-0.5 bg-black/10" />

            {/* CampusFood emblem */}
            <div className="w-12 h-12 rounded-full bg-white/90 flex flex-col items-center justify-center shadow-sm">
              <ShoppingBag className="w-6 h-6 text-[#08795d]" />
            </div>

            <div className="mt-2 text-[10px] font-black uppercase tracking-wider text-amber-950/70">
              CampusFood
            </div>
          </div>
        </div>
      </div>

      {/* Floating T22 and T34 Pickup Badges */}
      <div className="cf-tile -top-2 right-4 shadow-lg border border-emerald-100">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-extrabold text-[#08795d]">T22</span>
          <span className="text-[8px] text-slate-500 font-medium">Building</span>
        </div>
      </div>

      <div className="cf-tile bottom-2 right-2 shadow-lg border border-emerald-100">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-extrabold text-[#08795d]">T34</span>
          <span className="text-[8px] text-slate-500 font-medium">Building</span>
        </div>
      </div>

      <div className="cf-tile top-14 left-1 shadow-lg text-[#08795d]">
        <MapPin className="w-5 h-5 text-[#08795d]" />
      </div>
    </div>
  );
}

// Slide 2: Scheduled Window & Easy Collection Artwork
function ScheduleArt() {
  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {/* Central Accent Disk */}
      <div className="cf-inner-disk bg-gradient-to-tr from-[#08795d] to-[#0ba881]">
        {/* CSS Scheduled Bag & Clock Composition */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Bag handle */}
          <div className="w-10 h-7 border-4 border-[#b85b2e] rounded-t-full mb-[-4px]" />

          {/* Bag Body */}
          <div className="w-26 h-28 bg-gradient-to-b from-[#f09b52] to-[#d86e43] rounded-xl shadow-lg relative flex flex-col items-center justify-center p-3">
            {/* Clock emblem */}
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md">
              <Clock3 className="w-6 h-6 text-[#08795d]" />
            </div>

            <div className="mt-2 px-2 py-0.5 rounded-full bg-black/20 text-[9px] font-bold text-white tracking-wide">
              SCHEDULED
            </div>
          </div>
        </div>
      </div>

      {/* Floating Clock & Bell Badges */}
      <div className="cf-tile -top-2 left-4 shadow-lg">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-[#35b96a]">
          <Check className="w-5 h-5 stroke-[3]" />
        </div>
      </div>

      <div className="cf-tile top-8 right-2 shadow-lg">
        <div className="relative">
          <Bell className="w-5 h-5 text-amber-500" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        </div>
      </div>

      <div className="cf-tile -bottom-2 right-8 shadow-lg">
        <PackageCheck className="w-5 h-5 text-[#08795d]" />
      </div>
    </div>
  );
}

export default function OnboardingTour({ onFinish }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { language } = useLanguage();
  const isAmharic = language === 'am';

  const slides = [
    {
      id: 'favorite-meals',
      paleBg: '#f7f6ea',
      title: isAmharic ? 'የሚወዱት ምግብ፣ በአንድ ንክኪ ብቻ' : 'Your Favorite Meals, Just a Tap Away',
      highlightWord: isAmharic ? 'በአንድ ንክኪ' : 'Tap Away',
      description: isAmharic
        ? 'በካምፓስ ውስጥ ሳሉ ከካፊቴሪያዎ ጣፋጭ ምግቦችን በቀላሉ እዘዙ።'
        : 'Discover delicious meals from nearby campus kitchens and order your food without leaving your dorm.',
      card1: {
        icon: Utensils,
        iconBg: 'bg-emerald-100 text-[#08795d]',
        title: isAmharic ? 'ትኩስ እና ጣፋጭ' : 'Fresh & Hot',
        caption: isAmharic ? 'በየቀኑ ትኩስ ምግብ ይዘጋጃል።' : 'Meals prepared daily by campus kitchen.',
      },
      card2: {
        icon: Flame,
        iconBg: 'bg-amber-100 text-[#d48431]',
        title: isAmharic ? 'ቀላል ትዕዛዝ' : 'Easy Ordering',
        caption: isAmharic ? 'በጥቂት ንክኪዎች ብቻ ይዘዙ።' : 'Choose your favorite meals in just a few taps.',
      },
      ArtComponent: FoodArt,
    },
    {
      id: 'campus-pickup',
      paleBg: '#edf6ee',
      title: isAmharic ? 'ዛሬ እዘዙ። ካምፓስ ውስጥ ተቀበሉ።' : 'Order Today. Pick Up on Campus.',
      highlightWord: isAmharic ? 'ተቀበሉ።' : 'Campus.',
      description: isAmharic
        ? 'ምግብዎ እንደደረሰ በተዘጋጁት T22 ወይም T34 የመቀበያ ቦታዎች ያለ ምንም ሰልፍ ይውሰዱ።'
        : 'Collect your food at designated campus pickup points at T22 or T34 without unnecessary waiting.',
      card1: {
        icon: MapPin,
        iconBg: 'bg-emerald-100 text-[#08795d]',
        title: isAmharic ? 'የካምፓስ መቀበያ' : 'Campus Pickup',
        caption: isAmharic ? 'ምግብዎን በT22 ወይም T34 ይውሰዱ።' : 'Collect your order at T22 or T34.',
      },
      card2: {
        icon: Clock3,
        iconBg: 'bg-blue-100 text-blue-700',
        title: isAmharic ? 'አጭር ጥበቃ' : 'Less Waiting',
        caption: isAmharic ? 'ቀድመው በማዘዝ ጊዜዎን ይቆጥቡ።' : 'Order ahead and spend less time in queues.',
      },
      ArtComponent: PickupArt,
    },
    {
      id: 'scheduled-orders',
      paleBg: '#f7f6ea',
      title: isAmharic ? 'ምግብዎ፣ በሚፈልጉበት ሰዓት ዝግጁ' : 'Your Food, Ready When You Need It',
      highlightWord: isAmharic ? 'በሚፈልጉበት ሰዓት' : 'Need It',
      description: isAmharic
        ? 'በተወሰነው የቁርስ፣ ምሳ እና እራት መስኮት ውስጥ በማዘዝ በትክክለኛው ሰዓት ተቀበሉ።'
        : 'Order during the available meal window and collect your food right on time.',
      card1: {
        icon: Clock3,
        iconBg: 'bg-emerald-100 text-[#08795d]',
        title: isAmharic ? 'መርሃ-ግብር ትዕዛዝ' : 'Scheduled Ordering',
        caption: isAmharic ? 'በምግብ ሰዓት መስኮት ውስጥ ይዘዙ።' : 'Place order during the active meal window.',
      },
      card2: {
        icon: PackageCheck,
        iconBg: 'bg-amber-100 text-amber-800',
        title: isAmharic ? 'ቀላል መቀበል' : 'Easy Collection',
        caption: isAmharic ? 'የሚደርስበትን ሰዓት እና ቦታ ይወቁ።' : 'Know where and when to pick up your meal.',
      },
      ArtComponent: ScheduleArt,
    },
  ];

  const current = slides[currentSlide];
  const isFirstSlide = currentSlide === 0;
  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLastSlide) {
      onFinish();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstSlide) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const renderHighlightedTitle = (text, highlight) => {
    if (!highlight || !text.includes(highlight)) {
      return text;
    }
    const parts = text.split(highlight);
    return (
      <>
        {parts[0]}
        <span className="text-[#08795d] font-extrabold">{highlight}</span>
        {parts.slice(1).join(highlight)}
      </>
    );
  };

  const CurrentArt = current.ArtComponent;

  return (
    <div className="cf-shell-wrapper">
      <div className="cf-phone-shell font-campus">
        {/* Top Header with Skip & Language */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 z-10">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-extrabold text-[#08795d] tracking-tight">Campus</span>
            <span className="text-xl font-extrabold text-[#d48431] tracking-tight">Food</span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle className="static" />
            <button
              type="button"
              onClick={onFinish}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors px-2 py-1"
            >
              {isAmharic ? 'ዝለል' : 'Skip'}
            </button>
          </div>
        </div>

        {/* Central Illustration Area with Floating Cards */}
        <div className="flex-1 flex flex-col justify-center px-6 py-2">
          <div className="relative my-auto flex items-center justify-center">
            {/* Circular Disk Backdrop */}
            <div
              className="cf-art-disk"
              style={{ backgroundColor: current.paleBg }}
            >
              <CurrentArt />

              {/* Floating Feature Card 1 (Top Right) */}
              <div className="cf-feature-card top-right">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${current.card1.iconBg}`}
                >
                  <current.card1.icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-900 leading-tight">
                    {current.card1.title}
                  </div>
                  <div className="text-[9px] text-slate-500 leading-tight truncate">
                    {current.card1.caption}
                  </div>
                </div>
              </div>

              {/* Floating Feature Card 2 (Bottom Left) */}
              <div className="cf-feature-card bottom-left">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${current.card2.iconBg}`}
                >
                  <current.card2.icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-slate-900 leading-tight">
                    {current.card2.title}
                  </div>
                  <div className="text-[9px] text-slate-500 leading-tight truncate">
                    {current.card2.caption}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Heading and Copy */}
          <div className="mt-6 text-center px-2">
            <h1 className="text-[26px] sm:text-[30px] font-bold text-[#101426] leading-tight tracking-tight">
              {renderHighlightedTitle(current.title, current.highlightWord)}
            </h1>
            <p className="mt-2.5 text-[14px] sm:text-[15px] text-[#596571] leading-relaxed max-w-sm mx-auto">
              {current.description}
            </p>
          </div>
        </div>

        {/* Bottom Pagination & Action Controls */}
        <div className="px-6 pb-8 pt-3 flex flex-col items-center">
          {/* Pagination Dots */}
          <div className="flex items-center gap-2 mb-6" aria-label="Slide Indicator">
            {slides.map((_, index) => (
              <span
                key={index}
                className={`cf-dot ${index === currentSlide ? 'active' : 'inactive'}`}
              />
            ))}
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleNext}
            className="cf-primary-btn"
          >
            <span>{isLastSlide ? (isAmharic ? 'ጀምር' : 'Get Started') : isAmharic ? 'ቀጣይ' : 'Next'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Secondary Action (Back or Skip) */}
          <div className="mt-3.5 h-6 flex items-center justify-center">
            {!isFirstSlide ? (
              <button
                type="button"
                onClick={handleBack}
                className="cf-secondary-btn text-xs font-semibold"
              >
                {isAmharic ? 'ተመለስ' : 'Back'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onFinish}
                className="cf-secondary-btn text-xs font-semibold"
              >
                {isAmharic ? 'ዝለልና ወደ መግቢያ ሂድ' : 'Skip to Login'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
