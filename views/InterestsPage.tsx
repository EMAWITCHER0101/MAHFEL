
import React, { useState } from 'react';

interface InterestsPageProps {
  onInterestsSelected: (interests: string[]) => void;
}

const allInterests = [
    "گفتمان پیشرفت", "مدرسه سیاست", "قصه مقاومت",
    "روضه سرای هنر و اندیشه", "هیئت کتاب", "پادکست"
];


const InterestsPage: React.FC<InterestsPageProps> = ({ onInterestsSelected }) => {
  const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(interest)) {
        newSet.delete(interest);
      } else {
        newSet.add(interest);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    onInterestsSelected(Array.from(selectedInterests));
  };

  return (
    <div className="fixed inset-0 bg-background z-[2000] flex flex-col p-6 animate-fadeIn">
      <div className="text-center mt-8 mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2 ">به سرای هنر و اندیشه خوش آمدید!</h1>
        <p className="text-text-secondary">برای شروع، چند موضوع مورد علاقه خود را انتخاب کنید.</p>
      </div>
      
      <div className="flex-grow overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {allInterests.map(interest => {
            const isSelected = selectedInterests.has(interest);
            return (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={`p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                  isSelected
                    ? 'bg-primary border-primary-dark text-white font-bold shadow-lg'
                    : 'bg-card-bg border-border-color text-text-primary hover:border-primary hover:bg-primary-light-op'
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={handleContinue}
          className="w-full bg-primary text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-primary-dark transition-colors active:scale-95 disabled:opacity-50"
        >
          ذخیره و ادامه
        </button>
      </div>
    </div>
  );
};

export default InterestsPage;
