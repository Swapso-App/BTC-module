# Contributor Guidance for Bitcoin BTC-Module GSoC 2026

Welcome! This guide will help you write a strong GSoC proposal for Bitcoin BTC-Module and successfully contribute to our project.

---

## Table of Contents
1. [Before You Start](#before-you-start)
2. [How to Choose an Idea](#how-to-choose-an-idea)
3. [Writing a Strong Proposal](#writing-a-strong-proposal)
4. [Communication & Getting in Touch](#communication--getting-in-touch)
5. [FAQ](#faq)

---

## Before You Start

### Prerequisites
- **Technical Skills:** Solid understanding of TypeScript, JavaScript, and Node.js
- **Bitcoin Knowledge:** Familiarity with Bitcoin fundamentals (addresses, transactions, wallets)
- **Development Environment:** Git, Node.js (v14+), npm or yarn
- **Time Commitment:** GSoC requires 30-40 hours per week for 12 weeks

### Set Up Your Development Environment
1. **Clone the repository:**
   ```bash
   git clone https://github.com/Swapso-App/BTC-module.git
   cd BTC-module
   ```

2. **Install dependencies:**
   ```bash
   cd btc-controller
   npm install
   ```

3. **Run tests to verify setup:**
   ```bash
   npm test
   ```

4. **Explore the codebase:**
   - Review [btc-controller/README.md](btc-controller/README.md)
   - Study the main controller: [src/index.ts](btc-controller/src/index.ts)
   - Check existing tests: [test/](btc-controller/test/)

---

## How to Choose an Idea

### Step 1: Assess Your Skills
Review our [Ideas List](IDEAS.md) and match project difficulty to your experience level:
- **Easy (90 hours):** Good for first-time contributors or those new to Bitcoin
- **Medium (175 hours):** Requires solid TypeScript and Bitcoin knowledge
- **Hard (350 hours):** Best for experienced developers or those wanting a challenge

### Step 2: Read the Project Description
For each idea, carefully review:
- **Description:** What problem does it solve?
- **Goals:** What are the deliverables?
- **Skills Required:** Do you have these skills?
- **Getting Started:** Can you understand the starting point?

### Step 3: Explore the Relevant Code
Before choosing, **actually read the code** you'll be working with:
1. Check the files mentioned in "Getting Started"
2. Understand current implementation
3. Identify potential challenges
4. See where your code will fit

### Step 4: Test Your Understanding
- [ ] Can you explain the project in your own words?
- [ ] Do you understand the technical challenges?
- [ ] Can you identify potential solutions?
- [ ] Do you have questions for mentors?

If you answered "no" to any, **reach out to mentors BEFORE applying.**

---

## Writing a Strong Proposal

### Proposal Structure (Required)

We recommend organizing your proposal in this format:

#### 1. **Introduction** (2-3 paragraphs)
- Who are you? (Name, timezone, experience level)
- Why are you interested in this project specifically?
- What skills make you a good fit?

**Example:**
> "I'm Alice, a TypeScript developer from India (IST timezone) with 3 years of experience building cryptocurrency applications. I'm passionate about Bitcoin security and have contributed to [Project X] in the past. I chose this project because I want to deepen my understanding of multi-signature wallets while contributing to the ecosystem."

#### 2. **Project Understanding** (3-4 paragraphs)
- Demonstrate you've read the code and understand the project
- Explain the current limitations
- Show you understand what needs to be built
- Reference specific files/functions you reviewed

**Example:**
> "I've reviewed the current KeyringController implementation in src/index.ts and understand it only supports single-signature transactions. The project requires implementing BIP45 multi-account hierarchy, which will involve extending the derivedChild() method and creating new address generation logic..."

#### 3. **Proposed Solution** (4-6 paragraphs)
- Break down the project into phases (Week 1-2, Week 3-4, etc.)
- List specific deliverables for each phase
- Explain your approach and why you chose it
- Be realistic about timelines

**Example Timeline:**
```
Week 1-2: Research & Setup
- [ ] Study BIP45 specification in detail
- [ ] Set up test environment
- [ ] Create createMultiSigAddress() function prototype
- [ ] Write unit tests

Week 3-4: Core Implementation
- [ ] Implement BIP45 multi-account derivation
- [ ] Create full createMultiSigAddress() function
- [ ] Integrate with existing KeyringController
- [ ] Add integration tests

Week 5-6: Multi-Sig Signing
- [ ] Implement signMultiSigTransaction()
- [ ] Build partial signing support
- [ ] Test signature collection flow
- [ ] Handle edge cases

Week 7-8: Testing & Refinement
- [ ] Comprehensive test coverage
- [ ] Bug fixes and optimization
- [ ] Code review iterations
- [ ] Documentation

Week 9-10: Documentation
- [ ] Write usage examples
- [ ] Create API documentation
- [ ] Add troubleshooting guide
- [ ] Create tutorial

Week 11-12: Polish & Review
- [ ] Final testing and QA
- [ ] Address feedback from mentors
- [ ] Prepare demo
- [ ] Final documentation updates
```

#### 4. **Experience & Background** (2-3 paragraphs)
- Relevant past projects or experience
- Links to GitHub, portfolio, or code samples
- Why you're committed to open source
- How you handle challenges

#### 5. **Communication & Availability** (1-2 paragraphs)
- Your timezone and working hours
- Expected availability per week (30-40 hours)
- How you prefer to communicate (Slack, email, GitHub discussions)
- Time for breaks/vacations during GSoC period

#### 6. **Questions for Mentors** (Optional but recommended)
- 2-3 thoughtful questions about the project
- Shows you've done your homework
- Opens dialogue with mentors

---

### Proposal Length & Format

- **Target length:** 1,500-2,500 words (3-5 pages)
- **Format:** Clearly structured with headers and bullet points
- **Tone:** Professional, enthusiastic, and honest
- **Grammar:** Proofread carefully before submitting

### What Makes a Strong Proposal

 **DO:**
- Show you understand the codebase (reference specific files)
- Break work into realistic weekly milestones
- Be specific about deliverables and acceptance criteria
- Demonstrate relevant experience
- Ask clarifying questions
- Show enthusiasm for the project
- Explain your technical approach
- Include timeline with contingency buffer
- Commit to communication schedule

 **DON'T:**
- Copy generic proposal templates
- Propose features not in the ideas list
- Ignore the project's existing code style
- Make unrealistic promises
- Skip the technical details
- Assume you understand everything (ask!)
- Forget to proofread
- Write in first person constantly
- Propose changes that break compatibility
- Ignore timeline constraints

---

## Communication & Getting in Touch

### Before Submitting Your Proposal

**Please reach out!** We want to help you succeed.

1. **Join our community:**
   - Open an issue on [GitHub](https://github.com/Swapso-App/BTC-module) with your interest
   - Introduce yourself to the team
   - Ask clarifying questions about projects

2. **Direct contact with mentors:**
   - **Suraj Singla** (Lead Mentor)
     - GitHub: [@surajsingla333](https://github.com/surajsingla333)
   
   - **Aditya Ranjan**
     - Email: aditya@swapso.io
     - GitHub: [@adityaranjan2005](https://github.com/adityaranjan2005)
     - X: [@em_adii](https://x.com/em_adii)
   
   - **Aayush Pandey**
     - GitHub: [@Hsuyaa4518](https://github.com/Hsuyaa4518)
   
   - **Karan Gill**
     - GitHub: [@krn-gill](https://github.com/krn-gill)

3. **What to ask:**
   - "I'm interested in Idea X. Can you clarify...?"
   - "I've read the code and have questions about..."
   - "Does this approach sound reasonable...?"
   - "Any resources you'd recommend for..."

### Proposal Submission Timeline

- **Contributor Application Period:** Early March - Early April (Check GSoC website for exact dates)
- **Submit through:** [GSoC website](https://summerofcode.withgoogle.com/) contributor portal
- **Early submission recommended:** Submit 1-2 weeks before deadline
- **After submission:** Mentors will review and provide feedback

### During GSoC Period

- **Weekly standups:** Tuesday 10:00 AM UTC
- **Communication:** Slack/Discord for daily updates
- **Code review:** GitHub pull requests
- **Check-ins:** Regular 1-on-1 with assigned mentor
- **Expected response time:** Mentors respond within 24-48 hours

---

## FAQ

### Q: Do I need Bitcoin experience before applying?
**A:** Not necessarily! We welcome developers willing to learn. However, understanding Bitcoin basics (transactions, addresses, keys) is helpful. We have resources to help you learn.

### Q: Can I apply for multiple ideas?
**A:** Yes, but **choose one for your main proposal.** You can mention interest in others as backup options if your first choice is taken.

### Q: What's the success rate? Will my proposal be accepted?
**A:** GSoC is competitive. We typically receive 5-10 proposals per idea. To maximize chances:
- Submit early
- Show genuine understanding of the code
- Be realistic about timelines
- Ask mentors questions beforehand
- Demonstrate relevant experience

### Q: Do I need to have contributed to the project before applying?
**A:** No, but it helps! If you can:
- Fix a small bug
- Improve documentation
- Add a test case
This shows you're serious and understand the workflow.

### Q: What if I get stuck during GSoC?
**A:** This is normal! Here's what to do:
1. **Check documentation** - Might already be answered
2. **Search GitHub issues** - Similar problem might be solved
3. **Ask on Slack/Discord** - Get help from team
4. **Schedule a call** - Sync with mentor for complex issues
5. **Be proactive** - Don't wait until you're blocked for 2 weeks

### Q: Can I work on multiple ideas?
**A:** One idea per person. GSoC allows one slot per contributor. Choose wisely!

### Q: What timezone are you in?
**A:** Our mentors are in **IST (Indian Standard Time)**, but we're flexible. We'll work with your timezone.

### Q: How much time should I spend before submitting?
**A:** Minimum 10-20 hours of preparation:
- 5 hours: Reading project documentation
- 5 hours: Understanding the codebase
- 5-10 hours: Writing and refining proposal
- Additional: Reaching out to mentors with questions

### Q: Do you provide feedback on draft proposals?
**A:** Absolutely! Send us a draft or outline, and we'll give feedback. Email Aditya or open a GitHub discussion.

### Q: What if I can't complete the project?
**A:** Communication is key. If you face unexpected challenges:
1. Tell mentors immediately
2. Adjust timeline together
3. Focus on core deliverables
4. Document what you completed

We'd rather have honest communication than silent failures.

### Q: Can I start coding before GSoC officially begins?
**A:** Yes! In fact, we encourage it. Getting familiar with the codebase and setting up your environment is great prep.

---

## Next Steps

1. **Read the [Ideas List](IDEAS.md)** - Choose 1-2 ideas that interest you
2. **Clone and explore the code** - Get your environment set up
3. **Ask questions** - Email mentors with clarifications
4. **Write a draft proposal** - Share with mentors for feedback
5. **Submit your proposal** - Through GSoC website before deadline
6. **Good luck!** - We look forward to working with you!

---

## Resources

### Bitcoin Learning
- [Bitcoin for Beginners](https://bitcoin.org/en/getting-started)
- [BIP32 Specification](https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki)
- [BIP39 Specification](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
- [Bitcoin Transactions Explained](https://en.bitcoin.it/wiki/Transaction)

### TypeScript & Development
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Modern JavaScript](https://javascript.info/)
- [Node.js Documentation](https://nodejs.org/docs/)

### Open Source Contributing
- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [GitHub Guides](https://guides.github.com/)
- [Writing Good Commit Messages](https://chris.beams.io/posts/git-commit/)

### GSoC Resources
- [GSoC Official Website](https://summerofcode.withgoogle.com/)
- [GSoC Contributor Guide](https://developers.google.com/open-source/gsoc/help/contributor-guidance)
- [GSoC FAQ](https://summerofcode.withgoogle.com/help)

---

## Final Thoughts

This is an exciting opportunity to contribute to Bitcoin infrastructure! We're looking for contributors who are:
- **Curious** - Want to learn and understand the code
- **Communicative** - Ask questions and share updates
- **Committed** - Ready to dedicate 30-40 hours/week
- **Collaborative** - Open to feedback and iteration

If this sounds like you, **we'd love to have you on the team!**

Have more questions? Reach out to **aditya@swapso.io** or [@em_adii](https://x.com/em_adii).

**Happy coding! **
