export default function HowItWorks() {
  const steps = [
    { emoji: '📸', number: 1, title: 'Upload Photos', description: 'Take 5-20 photos of your pet from different angles' },
    { emoji: '🤖', number: 2, title: 'AI Training', description: 'We train the AI to recognize your pet (~10 min)' },
    { emoji: '✨', number: 3, title: 'Create Photos', description: 'Generate photos in any setting you can imagine' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-coral-100">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 text-center">
        How It Works
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-coral-400 to-peach-500 rounded-2xl flex items-center justify-center mb-3 shadow-md">
              <span className="text-2xl">{step.emoji}</span>
            </div>
            <div className="w-8 h-8 bg-coral-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-coral-600 font-bold text-sm">{step.number}</span>
            </div>
            <h3 className="font-semibold text-lg text-gray-900 mb-1">{step.title}</h3>
            <p className="text-sm text-gray-600">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
