'use client';

interface StepHeaderProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { number: 1, label: 'Order & Images' },
  { number: 2, label: 'Editor' },
  { number: 3, label: 'Export & Results' },
];

export default function StepHeader({ currentStep, onStepClick }: StepHeaderProps) {
  return (
    <div className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {STEPS.map((step, index) => (
            <div key={step.number} className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Only allow clicking on completed steps or current step
                  if (step.number <= currentStep) {
                    onStepClick?.(step.number);
                  }
                }}
                disabled={step.number > currentStep}
                className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
                  step.number === currentStep
                    ? 'bg-primary text-white'
                    : step.number < currentStep
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 cursor-pointer'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
                  {step.number}
                </span>
                <span className="text-sm font-medium">{step.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <span className="text-gray-600 mx-2">→</span>
              )}
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500">
          Step {currentStep} of {STEPS.length}
        </div>
      </div>
    </div>
  );
}

