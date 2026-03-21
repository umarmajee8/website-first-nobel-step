
// Removed GoogleGenAI import to eliminate API key usage

export const getAIResponse = async (userMessage: string) => {
  // Simulate network delay for a natural chat feel
  await new Promise((resolve) => setTimeout(resolve, 600));

  const lowerMsg = userMessage.toLowerCase();

  // Rule-based responses
  if (lowerMsg.includes("registered") || lowerMsg.includes("legal") || lowerMsg.includes("scam") || lowerMsg.includes("fake") || lowerMsg.includes("verify") || lowerMsg.includes("real")) {
    return "Yes, First Nobel Step (Pvt.) Ltd. is a legally registered Private Limited company dedicated to connecting our citizens with global funding, scholarships, and sponsored career opportunities.";
  }

  if (lowerMsg.includes("student") || lowerMsg.includes("study") || lowerMsg.includes("university") || lowerMsg.includes("scholarship")) {
    return "Our Official Student Program offers full academic scholarships until graduation, opportunities to earn while learning, and paid internships via verified partners. It is designed to secure your academic and professional future.";
  }

  if (lowerMsg.includes("entrepreneur") || lowerMsg.includes("business") || lowerMsg.includes("startup") || lowerMsg.includes("fund") || lowerMsg.includes("idea")) {
    return "The Entrepreneur Program is designed to help you transform your vision into a funded reality. Members get access to strategic feedback, business opportunity alerts, and powerful networking with industry leaders.";
  }

  if (lowerMsg.includes("professional") || lowerMsg.includes("job") || lowerMsg.includes("work") || lowerMsg.includes("career") || lowerMsg.includes("overseas")) {
    return "Our Professional Program is our most popular choice (Official Professional Choice). It provides direct access to fully sponsored international career opportunities, with expenses borne for verified job placements in top economies.";
  }

  if (lowerMsg.includes("fee") || lowerMsg.includes("cost") || lowerMsg.includes("price") || lowerMsg.includes("charges") || lowerMsg.includes("pay")) {
    return "The processing fee for our official membership programs is PKR 1,500. This is a one-time processing fee for the application review and verification process.";
  }

  if (lowerMsg.includes("apply") || lowerMsg.includes("join") || lowerMsg.includes("register") || lowerMsg.includes("signup")) {
    return "You can apply by clicking the 'Apply Now' button in the header or on any of the membership cards. The process is simple: Select your plan, fill in your details, and generate your challan.";
  }

  if (lowerMsg.includes("salam") || lowerMsg.includes("hi") || lowerMsg.includes("hello") || lowerMsg.includes("hey")) {
    return "Wa Alaikum Assalam! Welcome to First Nobel Step. I am your automated support assistant. How can I help you today regarding our Student, Entrepreneur, or Professional programs?";
  }

  // Default fallback response
  return "I am here to assist you regarding our official programs. You can ask me about:\n\n1. **Student Scholarships**\n2. **Entrepreneur Funding**\n3. **Professional Jobs**\n4. **Company Registration**";
};
