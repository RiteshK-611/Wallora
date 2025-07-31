import React, { useState } from 'react';

interface SetupScreenProps {
  onComplete: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to LiveLayer',
      subtitle: 'Premium Wallpaper Experience',
      content: (
        <div className="setup-welcome">
          <div className="setup-logo">✨</div>
          <p className="setup-description">
            Transform your desktop with dynamic wallpapers, live videos, and customizable widgets.
          </p>
          <div className="setup-features">
            <div className="feature-item">
              <span className="feature-icon">🖼️</span>
              <span>Dynamic Wallpapers</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎬</span>
              <span>Live Video Backgrounds</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📅</span>
              <span>Customizable Date Widget</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'System Integration',
      subtitle: 'Seamless Desktop Experience',
      content: (
        <div className="setup-integration">
          <div className="integration-info">
            <h3>What LiveLayer does:</h3>
            <ul>
              <li>✅ Sets wallpapers and live backgrounds</li>
              <li>✅ Creates desktop widgets</li>
              <li>✅ Runs in system tray</li>
              <li>✅ Auto-starts with Windows (optional)</li>
            </ul>
          </div>
          <div className="privacy-note">
            <p><strong>Privacy:</strong> LiveLayer only accesses files you select and doesn't collect any personal data.</p>
          </div>
        </div>
      )
    },
    {
      title: 'Ready to Start',
      subtitle: 'Your desktop transformation awaits',
      content: (
        <div className="setup-ready">
          <div className="ready-icon">🚀</div>
          <p>LiveLayer is ready to transform your desktop experience!</p>
          <div className="quick-tips">
            <h4>Quick Tips:</h4>
            <ul>
              <li>Use the system tray icon to quickly access LiveLayer</li>
              <li>Right-click wallpapers to set them instantly</li>
              <li>Drag the date widget to reposition it</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="setup-screen">
      <div className="setup-container">
        <div className="setup-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {currentStep + 1} of {steps.length}
          </span>
        </div>

        <div className="setup-content">
          <h1 className="setup-title">{steps[currentStep].title}</h1>
          <p className="setup-subtitle">{steps[currentStep].subtitle}</p>
          
          <div className="setup-body">
            {steps[currentStep].content}
          </div>
        </div>

        <div className="setup-actions">
          {currentStep > 0 && (
            <button onClick={prevStep} className="btn btn-secondary">
              ← Back
            </button>
          )}
          <button onClick={nextStep} className="btn btn-primary">
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;