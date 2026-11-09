// The Financial Mirror: 12 questions, 5 archetypes and a "no clear pattern" result.
// Text and scoring are from IMARA_Financial_Mirror_v3.html, unchanged.
// Archetype keys: K=Kemi (Survivor), An=Annie (Giver), Am=Ama (Drifter),
// T=Thandi (Settler), Z=Zara (Spender), R=Nia (Cultivator, no clear pattern).

export const QS = [
  {
    phase:"Your Beginning",
    q:"Growing up, what did the women around you model for you financially?",
    opts:[
      {t:"Survival. Women work hard, struggle quietly and carry everyone", sc:{K:2}},
      {t:"Generosity. Women give — to family, to church — before they give to themselves", sc:{An:2}},
      {t:"Appearances. Women kept up the look of doing well, whatever was happening behind the scenes", sc:{Z:2}},
      {t:"Stability. Women managed the home, not big financial ambitions", sc:{T:2}},
      {t:"Hoping. Nobody really planned — things were handled when they came", sc:{Am:2}},
      {t:"She had her own land, her own business, her own money — I saw a woman building real wealth, not just getting by", sc:{}}
    ]
  },
  {
    phase:"Your Beginning",
    q:"Before you turned 18, was anyone in your life intentionally teaching you how to manage, save or grow money?",
    opts:[
      {t:"No. Nobody ever taught me anything about money", sc:{K:1,Am:1}},
      {t:"I heard general things like 'save money' but nothing practical or real", sc:{Am:2}},
      {t:"I watched my mother or grandmother struggle and learned to survive from watching her", sc:{K:2}},
      {t:"I saw money spent to look successful — and learned that is what success costs", sc:{Z:2}},
      {t:"I had some exposure but no real structure, so I played it safe", sc:{T:2}},
      {t:"Yes — someone genuinely sat with me and taught me real financial principles", sc:{}}
    ]
  },
  {
    phase:"Your Reality",
    q:"When money lands in your account — what honestly happens to it?",
    opts:[
      {t:"It disappears. By month end there is nothing and I am not always sure where it went", sc:{Z:2}},
      {t:"I try to put something aside but something always comes to take it before month end", sc:{K:2}},
      {t:"I save when I have extra — which honestly is not often", sc:{Am:1,An:1}},
      {t:"I have savings but they have not really grown in a long time", sc:{T:2}},
      {t:"I save every single month without fail and my savings are growing", sc:{}}
    ]
  },
  {
    phase:"Your Reality",
    q:"Think about last month honestly. How much of your money went to other people — a family member who needed help, a contribution, a loan, supporting someone at home?",
    opts:[
      {t:"More than half of everything I earned", sc:{An:2}},
      {t:"A big chunk — probably 30 to 40 percent", sc:{An:2}},
      {t:"A meaningful amount — I find it genuinely hard to say no", sc:{An:2}},
      {t:"Very little — I have clear limits around this", sc:{}},
      {t:"None — I do not face this kind of pressure", sc:{}}
    ]
  },
  {
    phase:"Your Reality",
    q:"If you lost your primary income tomorrow, how long could you survive — without borrowing money and without asking anyone for help?",
    opts:[
      {t:"Less than one week", sc:{K:2}},
      {t:"Two to four weeks", sc:{K:1,An:1}},
      {t:"One to three months", sc:{Am:1,Z:1}},
      {t:"Three to six months", sc:{T:1}},
      {t:"Six months or more", sc:{}}
    ]
  },
  {
    phase:"Your Reality",
    q:"In a normal month, where does most of your money honestly go?",
    opts:[
      {t:"Urgent needs and emergencies — whatever is on fire that week", sc:{K:2}},
      {t:"Other people — family, church, friends and their needs", sc:{An:2}},
      {t:"Lifestyle — eating out, clothes, hair, outings, looking the part", sc:{Z:2}},
      {t:"Bills and routine — everything is covered, and not much more happens", sc:{T:2}},
      {t:"I honestly do not track it. I would have to guess", sc:{Am:2}},
      {t:"Into a plan I set before the month began", sc:{}}
    ]
  },
  {
    phase:"What You Have Built",
    q:"Do you have money growing somewhere right now — not a small token amount, but something that, if it kept growing for the next ten years, could actually change your financial future?",
    opts:[
      {t:"No. There is nowhere my money is currently growing", sc:{K:1,An:1}},
      {t:"I have something very small — honestly not enough to build a real future on", sc:{Am:2}},
      {t:"I have something but I am not sure if it is growing or what it is actually worth", sc:{T:1,Z:1}},
      {t:"Yes — I have real investments that are growing and building toward something meaningful", sc:{}}
    ]
  },
  {
    phase:"What You Have Built",
    q:"Have you ever been in a conversation about money — someone talking about what they are saving, building, investing — and you smiled and nodded, but inside you were ashamed of where you actually are?",
    opts:[
      {t:"Yes, often. Money conversations make me go quiet or change the subject", sc:{K:1,Z:1}},
      {t:"Sometimes — I share some things but never the full picture", sc:{Z:2}},
      {t:"Occasionally — but I am becoming more honest about it", sc:{T:1}},
      {t:"Rarely — I am fairly open about my finances", sc:{}},
      {t:"Never — I am completely transparent about where I stand", sc:{}}
    ]
  },
  {
    phase:"What You Have Built",
    q:"Look at all the money you have right now — in your account, your purse, anywhere. How much of it is truly free? No one waiting for their share. No bill about to clear it. Nothing you have already promised to someone.",
    opts:[
      {t:"Nothing. My account is empty or as good as empty", sc:{K:2}},
      {t:"Less than one month of what I spend — barely a cushion", sc:{K:1,An:1}},
      {t:"Enough for about one to two months — something but not real security", sc:{Am:1,T:1}},
      {t:"More than three months of my expenses — I have a real buffer behind me", sc:{}},
      {t:"I honestly do not know what I have that is truly free", sc:{Z:2}}
    ]
  },
  {
    phase:"Your Future",
    q:"If your financial life looks exactly the same five years from today — same patterns, same habits, same results — how do you honestly feel about that?",
    opts:[
      {t:"Terrified. I absolutely cannot afford for nothing to change", sc:{K:2}},
      {t:"Resigned. I am not sure I know how to make it different", sc:{An:1,Am:1}},
      {t:"Uncomfortable. Something must shift but I honestly do not know how", sc:{Am:2}},
      {t:"Cautious. I am on a path but I know I could do more", sc:{T:2}},
      {t:"Confident. I am already moving in the right direction", sc:{}}
    ]
  },
  {
    phase:"Your Future",
    q:"Which of these most honestly describes how you make financial decisions every day?",
    opts:[
      {t:"Reactively — I deal with whatever feels most urgent right now", sc:{K:2}},
      {t:"Emotionally — how I feel on a given day shapes what I spend", sc:{Z:2}},
      {t:"Generously — other people's needs arrive before my own financial plan", sc:{An:2}},
      {t:"Passively — I follow the path of least resistance and avoid the hard decisions", sc:{Am:1,T:1}},
      {t:"Intentionally — every financial decision serves a bigger plan I have chosen", sc:{}}
    ]
  },
  {
    phase:"Your Future",
    q:"When you imagine yourself old — 65, maybe 70 — and you can no longer work the way you do today... who or what do you honestly picture taking care of you financially?",
    opts:[
      {t:"My children — I am hoping they will be in a position to help me", sc:{An:2}},
      {t:"I am trusting God to provide — but I have not made much of a plan alongside that", sc:{Am:2}},
      {t:"A partner's income or savings — I am counting on that more than on my own", sc:{T:2}},
      {t:"I will sort it out when I earn more", sc:{Z:2}},
      {t:"I honestly do not know — I try not to think about it", sc:{K:1,Am:1}},
      {t:"Myself — from the savings, investments and assets I am building right now", sc:{}}
    ]
  }
];

export const A = {
  K:{
    name:"Kemi",type:"The Survivor",
    tagline:'"I handle it. I always handle it." — But handling it was never supposed to be the plan.',
    mirror:`<p>You are strong. Everyone around you knows it.</p>
<p>When something goes wrong, your name comes up. When there is a problem, you sort it. When money is needed, somehow you find a way.</p>
<p>But here is something nobody has said to you out loud — and it is time someone did.</p>
<p><strong>Being strong is not the same as being free.</strong></p>
<p>You have been handling things for so long that handling things has become your whole financial plan. Money comes in. Something needs it. Month ends. Nothing left. You wake up and do it all over again.</p>
<p>It is not because you are careless. It is not because you do not try hard enough. It is because no one ever sat you down and showed you that the goal was supposed to be different.</p>
<p>You were never supposed to just survive. <strong>You were supposed to build.</strong></p>`,
    proj:`<p>Picture yourself at 65.</p>
<p>No salary coming in. No energy left for the kind of hustle that has carried you this far. The children you raised are now adults with their own lives and their own pressures.</p>
<p>And you need help.</p>
<p>Not because you were lazy. Not because you did not try. But because survival was never going to become security on its own — and no one built a system with you while you were busy holding everything together.</p>
<p><strong>The woman who was everyone's solution will need someone to solve for her.</strong> That is not the ending you deserve.</p>`,
    cost:"Every year you spend in survival mode instead of building mode is a year of growth that is gone forever. The women who will be free at 65 are not smarter than you. They are not harder workers than you. They simply got a structure that took their strength and pointed it at the right target. You have the strength. You have always had it. You just need a different direction.",
    steps:[
      {t:"Join IMARA — today, not next month.",b:"This is not a suggestion. It is the direct answer to exactly what this mirror has shown you. IMARA was built for Kemi. For the woman who is strong enough to survive anything and has never had anyone show her how to build."},
      {t:"This week:",b:"Open one savings account that is completely separate from your main account. Transfer any amount — even if it is very small. This is not about the money yet. It is about choosing yourself first. Possibly for the very first time."},
      {t:"This month:",b:"Write down every person and every obligation that regularly takes money from you. Ask yourself honestly — which of these is truly unavoidable, and which is simply a habit I have never questioned?"}
    ],
    ctaT:"Kemi, it is time to stop surviving and start building.",
    ctaB:"IMARA Wealth Trybe was designed for women exactly like you. Women with real strength and no system. Join a circle of women who will show you how to redirect what you have always had into what you have always deserved."
  },
  An:{
    name:"Annie",type:"The Giver",
    tagline:'"There will be something left for me later." — There won\'t be. Not unless something changes today.',
    mirror:`<p>When there is a need, your name comes up.</p>
<p>A family member calls — you help. The church needs — you give. A friend is short — you find something. You are the person people come to first. And part of you is proud of that.</p>
<p>But here is the truth no one in your life has been brave enough to say:</p>
<p><strong>You are building everyone's future except your own.</strong></p>
<p>The money that leaves your hands for the people you love — that is not wrong. Giving is not your problem. The problem is the balance. Right now, everyone is getting a piece of you. And you are getting almost nothing back.</p>
<p>You are filling bucket after bucket — and yours has a hole in the bottom.</p>
<p>The most heartbreaking part? You have never shown the people around you that you need anything. You are too reliable. Too capable. <strong>Too Annie.</strong></p>`,
    proj:`<p>Picture yourself at 65.</p>
<p>The people you helped are doing well. The children are grown. The relatives you supported are on their feet.</p>
<p>And you are asking them for help.</p>
<p>Not because you did not work. Not because you did not care. Because you cared about everyone else's future more than your own — and now the future has arrived and there is nothing there for you.</p>
<p><strong>The woman who gave the most will have the least.</strong> That is not a fair ending. But it is the honest one, if nothing changes today.</p>`,
    cost:"Every year that you give without a plan for yourself is one more year your old age depends on other people's goodwill. Goodwill is not a pension. Love does not pay bills. The time to build your own security is not after everyone else is settled — it is now, running alongside everything else you are already carrying.",
    steps:[
      {t:"Join IMARA — because you have earned the right to be poured into.",b:"IMARA will not teach you to stop being generous. It will teach you to be generous and secure at the same time — and show you exactly how to do both without guilt or shame."},
      {t:"This week:",b:"Before you respond to the next money request that comes to you, pause and ask yourself one question first: 'If I give this, what happens to my future?' You do not have to say no. But you must ask the question."},
      {t:"This month:",b:"Add up honestly how much of your money went to other people last month. Write that number down and look at it. That number is the beginning of your financial plan — because redirecting even a small part of it toward yourself is where your freedom starts."}
    ],
    ctaT:"Annie, you have given enough to everyone else. It is your turn now.",
    ctaB:"IMARA Wealth Trybe is a community of women who will hold your future with the same commitment that you hold everyone else's. For the first time, someone will be building alongside you — not just taking from you."
  },
  Am:{
    name:"Ama",type:"The Drifter",
    tagline:'"I will start properly next month." — Next month has been coming for years now.',
    mirror:`<p>You know.</p>
<p>That is the honest thing about Ama. You already know what you should be doing. You have probably known for a while. You have read the posts. Saved the content. Maybe even downloaded the app. You understand the problem clearly.</p>
<p>But understanding the problem and solving the problem are two completely different things.</p>
<p><strong>The gap between knowing and doing has quietly become years. And those years are gone.</strong></p>
<p>Every month you say "I will start properly next month" — that month passes. And the version of you that keeps choosing later is stealing from the version of you that deserves to be free.</p>
<p>You are not lazy. You are not confused. You are stuck in the most expensive habit in the world: <strong>almost starting.</strong></p>`,
    proj:`<p>Picture yourself at 65.</p>
<p>You can explain exactly how you got there. You understand compound interest. You know what an investment is. You could advise anyone on what to do with their money.</p>
<p>And you have almost nothing saved.</p>
<p>Not because you did not know. But because knowing without doing, for long enough, produces the same result as never knowing at all.</p>
<p><strong>The most financially educated woman in the room — with the least to show for it.</strong> That is Ama's story, if she keeps choosing next month.</p>`,
    cost:"Starting one year later is not just one year lost. It is the compound return on every naira, rand and shilling that year would have grown into — gone forever. 'Next month' is not a small cost. It is a generational one. And you have been paying it silently for longer than you realise.",
    steps:[
      {t:"Join IMARA — because Ama does not need more information.",b:"She needs a structure that makes starting impossible to avoid. A community that will not allow 'next month' to remain an option. That is exactly what IMARA is built to do for women like you."},
      {t:"Today — not this week, today:",b:"Do one financial action before you sleep tonight. Transfer something. Write one number down. Open one account. It does not need to be big. It needs to happen tonight."},
      {t:"This month:",b:"Tell one person you trust what you are going to do financially — and ask them to check on you in 30 days. Ama's problem is not knowledge. It is accountability. Give one person permission to hold you to it."}
    ],
    ctaT:"Ama, you already know everything except how to start. IMARA will fix that.",
    ctaB:"IMARA Wealth Trybe turns knowledge into action through community, structure, and a mentor who will not let you drift. This is the structure you have been waiting for without knowing what to call it."
  },
  T:{
    name:"Thandi",type:"The Settler",
    tagline:'"I\'m not in crisis. I\'m fine." — Fine is not freedom. And fine is not where your story ends.',
    mirror:`<p>You have done something real.</p>
<p>You have more stability than many women around you. You are not in crisis. The bills are paid. You are managing. And that took genuine work to reach — we are not dismissing that for a moment.</p>
<p>But something happened quietly along the way.</p>
<p>You got comfortable enough to stop moving. And comfort, when it lasts long enough, becomes a ceiling.</p>
<p><strong>"I'm fine" is not a financial plan. It is a pause.</strong> And Thandi has been paused for a while now.</p>
<p>You are not failing. But you are not growing either. And in a world where everything keeps getting more expensive, not growing is actually moving backwards — slowly, quietly, without any drama to warn you.</p>
<p>Fine is not freedom. Fine is where women stop <strong>before they get there.</strong></p>`,
    proj:`<p>Picture yourself at 65.</p>
<p>Comfortable enough. Nothing dramatic. Bills manageable. You have what you need — mostly.</p>
<p>But you do not have real choices.</p>
<p>You cannot decide not to work simply because you want to. You cannot give generously from a place of true abundance. You cannot leave something meaningful behind.</p>
<p>You have a life that is fine. And somewhere inside you, you have always known <strong>you were built for more than fine.</strong></p>`,
    cost:"Every year of staying comfortable in a world with rising costs is actually a year of quiet decline. You are not standing still. The ground is moving beneath you — and choosing comfortable today is its own kind of falling behind. Slowly. Peacefully. But falling nonetheless.",
    steps:[
      {t:"Join IMARA — not because you are failing, but because fine is not your finish line.",b:"Thandi does not need rescuing. She needs disruption. The right kind. A community that will not allow comfortable to become permanent."},
      {t:"This week:",b:"Ask yourself honestly — what is the next financial level above where I am today? And what exactly is stopping me from moving toward it? Write your answer down. By hand. The answer will tell you more than you expect."},
      {t:"This month:",b:"Set one financial goal that makes you genuinely uncomfortable — not a small stretch, but something that would require you to actually change a real behaviour to achieve. That discomfort is not a warning. It is growth starting."}
    ],
    ctaT:"Thandi, comfortable is a beautiful place to visit. It was never meant to be your destination.",
    ctaB:"IMARA Wealth Trybe is where women who have achieved stability come to build sovereignty. Come and discover what becomes possible when fine is no longer enough."
  },
  Z:{
    name:"Zara",type:"The Spender",
    tagline:'"I make good money. I\'ll sort it when I earn more." — More income has never fixed this. Only a new decision will.',
    mirror:`<p>Your income is real. You work hard. You earn.</p>
<p>People around you see a woman who is doing well. Maybe even a woman who has made it. And you have worked hard for that life — for the image that says success.</p>
<p>But here is what you know privately, that you have not said out loud:</p>
<p><strong>What comes in and what stays are two very different numbers.</strong></p>
<p>The money arrives. And then it goes. On things that feel real, feel necessary, feel like they say something about who you are. And if you looked honestly at the gap between what you earn and what you have actually built — it would sit very uncomfortably with you.</p>
<p>You are not struggling. But you are not building. And the difference between earning and building is the difference between looking wealthy and actually becoming wealthy.</p>
<p>The most dangerous thing about Zara's life is this: because she earns well, <strong>no one worries about her.</strong> No one checks on her. The problem grows quietly in the dark, with no one watching.</p>`,
    proj:`<p>Picture yourself at 65.</p>
<p>Your work history is impressive. The lifestyle looked successful. People who knew you would say you did well.</p>
<p>But the actual wealth — the savings, the investments, the assets — tells a completely different story.</p>
<p>You earned significantly across your lifetime. <strong>And you built very little of it into something permanent.</strong></p>
<p>One job loss. One health crisis. One business that does not work out. And the whole picture changes very fast. Quietly not enough — after all that work.</p>`,
    cost:"Earning well without building is not wealth — it is well-paid survival. Every year that your income goes up but your net worth does not is a year your future self will have to answer for. More income has never solved this problem for anyone. Only a different decision about what you do with what you already have will.",
    steps:[
      {t:"Join IMARA — because Zara needs one thing above everything else:",b:"A space where she can be completely honest about her real numbers — without performing, without the image. IMARA is that space. And it gives her the exact tools to redirect what she earns into what she builds."},
      {t:"This week:",b:"Calculate your net worth. Everything you own of real value, minus everything you owe. Write that number down and look at it without flinching. You cannot fix a number you are hiding from."},
      {t:"This month:",b:"Find one place your money goes that is paying for image rather than building your future. One subscription, one habit, one expense that is about how things look — not where you are going. Redirect it, even partially. That is where Zara's freedom begins."}
    ],
    ctaT:"Zara, you have the income. IMARA will show you how to finally build with it.",
    ctaB:"IMARA Wealth Trybe is where women who earn well come to learn how to build wealth — not just income. Come and close the gap between the life you appear to be living and the one you are actually building."
  },
  R:{
    name:"Nia",type:"The Cultivator",
    tagline:"\"I have a base, and I am building on it.\" — The question now is how far, and who you take with you.",
    mirror:`<p>Your answers tell a different story from most.</p>
<p>You are not living pay cheque to pay cheque in survival mode. You are not giving everything away, drifting, settling or spending to be seen. You have habits, a buffer and some direction.</p>
<p>That is rare, and it is worth saying plainly: <strong>you have built something real.</strong></p>
<p>But a strong foundation is not a finished building. The women who keep growing from here are the ones who put their foundation to work, and who bring other women up with them.</p>`,
    proj:`<p>Picture yourself at 65.</p>
<p>You have options. You can choose your work, give from overflow and leave something behind.</p>
<p>So the question this mirror leaves you with is not "will I be okay?" It is <strong>how much more could I build, and for how many other women?</strong></p>`,
    cost:"For a woman who is already doing well, the cost of waiting is quieter. It is not a crisis. It is the compounding you could have had, and the women you could have lifted, while a good foundation sat there being enough. Strong foundations are meant to be built on.",
    steps:[
      {t:"Join IMARA — to multiply what you have built, not to start over.",b:"IMARA is not only for women in trouble. It is for women ready to turn personal stability into a legacy, with a circle that builds alongside them."},
      {t:"This week:",b:"Write down your three biggest financial wins from the last two years. Look at what they have in common. That is your method, and a method can be taught."},
      {t:"This month:",b:"Think of one woman in your life who is where you were three years ago. Ask yourself what you could pass on to her, and how."}
    ],
    ctaT:"You already have the foundation. IMARA is where it multiplies.",
    ctaB:"IMARA Wealth Trybe is for women ready to turn stability into a legacy, building wealth with a circle and lifting other women as they go."
  }
};

export const NO_PATTERN_BELOW = 4      // a top score under this = Nia (no clear pattern)
export const TIE_ORDER = ['Z', 'Am', 'T', 'An', 'K']   // ties go to the hardest to detect, so Kemi is not the default

export function pickResult(scores) {
  let top = -1
  let win = null
  TIE_ORDER.forEach((k) => { if (scores[k] > top) { top = scores[k]; win = k } })
  if (top < NO_PATTERN_BELOW) return { k: 'R', a: null }
  let also = null
  let best = -1
  TIE_ORDER.forEach((k) => { if (k !== win && scores[k] > best) { best = scores[k]; also = k } })
  if (!(best >= 4 && best >= top - 2)) also = null
  return { k: win, a: also }
}
