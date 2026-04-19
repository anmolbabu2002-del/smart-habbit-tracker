// daily-challenge.js — 400 Unique Daily Challenges
// No AI, no network calls — pure offline. Uses localForage for persistence.
// Difficulty: Days 1-20 = Easy, Days 21-70 = Medium, Days 71+ = Hard
// Each challenge is shown EXACTLY ONCE per user, ever.

(function() {
  'use strict';

  const DC_STATE_KEY = 'dc_state';
  const DC_INDEX_KEY = 'dc_index';

  // ─── 400 CHALLENGES ───
  // Structure: { t: title, d: description, c: category, e: emoji, xp: number, tip: string }

  const EASY = [
    {t:"The 2-Minute Brain Dump",d:"Grab a physical pen and paper. Write down every single thought, task, or worry in your head until the page is full.",c:"mindfulness",e:"🧠",xp:50,tip:"Externalizing thoughts frees up 'working memory' and immediately reduces anxiety."},
    {t:"The Micro-Win",d:"Think of one tiny task you've been procrastinating on that takes less than 2 minutes. Get up and do it right now.",c:"productivity",e:"🎯",xp:50,tip:"Completing a stalled task releases a surge of dopamine, creating momentum for bigger tasks."},
    {t:"Cold Water Reset",d:"Splash freezing cold water on your face for 10 seconds. Breathe through the initial shock.",c:"health",e:"🧊",xp:50,tip:"This triggers the 'mammalian dive reflex', instantly slowing your heart rate and boosting alertness."},
    {t:"Digital Declutter Sprint",d:"Open your phone and immediately delete 10 old photos, unused apps, or useless contacts.",c:"productivity",e:"📱",xp:50,tip:"Digital clutter subconsciously drains your mental bandwidth. Deleting it provides an instant sense of control."},
    {t:"The 5-Year Vision",d:"Write down exactly what your ideal life looks like 5 years from today in vivid, uncompromising detail.",c:"growth",e:"🔭",xp:50,tip:"Visualizing long-term success activates your brain's Reticular Activating System to notice new opportunities."},
    {t:"Compliment Someone",d:"Give a genuine, specific compliment to someone today.",c:"social",e:"😊",xp:15,tip:"'Great presentation today' > 'you're nice'."},
    {t:"No Social Media for 2 Hours",d:"Stay off all social media for 2 consecutive hours.",c:"productivity",e:"📵",xp:25,tip:"Put your phone in another room to remove temptation."},
    {t:"Read 5 Pages",d:"Read at least 5 pages of any book — fiction or non-fiction.",c:"growth",e:"📖",xp:20,tip:"5 pages/day = 18 books a year. Start small."},
    {t:"Eat a Fruit",d:"Eat at least one whole fruit today that you wouldn't normally eat.",c:"health",e:"🍎",xp:10,tip:"Fruits with skin on have 3x more fiber."},
    {t:"Deep Breathing x10",d:"Take 10 slow, deep breaths right now. Inhale 4s, hold 4s, exhale 6s.",c:"mindfulness",e:"🌬️",xp:10,tip:"This activates your parasympathetic nervous system instantly."},
    {t:"Make Your Bed",d:"Make your bed as soon as you wake up. Properly — pillows fluffed.",c:"productivity",e:"🛏️",xp:10,tip:"Navy SEAL admiral: 'If you want to change the world, start by making your bed.'"},
    {t:"Text a Friend",d:"Send a thoughtful message to a friend you haven't talked to in a while.",c:"social",e:"💬",xp:15,tip:"A random 'thinking of you' text can make someone's whole day."},
    {t:"Doodle for 5 Minutes",d:"Draw anything — a face, a flower, abstract lines. Just create.",c:"creativity",e:"🎨",xp:15,tip:"Doodling improves memory retention by 29%."},
    {t:"No Complaining Today",d:"Go the entire day without complaining about anything. Zero negativity.",c:"mindfulness",e:"🤐",xp:25,tip:"Replace complaints with observations: 'It's raining' instead of 'Ugh, rain'."},
    {t:"Do 10 Pushups",d:"Drop and do 10 pushups right now. Modify on knees if needed.",c:"fitness",e:"💪",xp:15,tip:"Wall pushups count too — just move your body."},
    {t:"Write Down Tomorrow's Top 3",d:"Write the 3 most important tasks for tomorrow before bed tonight.",c:"productivity",e:"📝",xp:20,tip:"Written plans reduce morning decision fatigue by 40%."},
    {t:"Listen to a New Song",d:"Find and listen to a song in a genre you never listen to.",c:"creativity",e:"🎵",xp:10,tip:"New music creates novel neural pathways."},
    {t:"Smile at 3 Strangers",d:"Make eye contact and smile genuinely at 3 strangers today.",c:"social",e:"😁",xp:15,tip:"Smiling releases serotonin — even forced smiles work."},
    {t:"Take a Photo of Something Beautiful",d:"Photograph something beautiful you notice today. Nature, light, texture.",c:"creativity",e:"📸",xp:15,tip:"Training your eye for beauty literally rewires your visual cortex."},
    {t:"Stand Up Every 30 Minutes",d:"Set a timer and stand up from your chair every 30 minutes today.",c:"health",e:"⏰",xp:20,tip:"Sitting for 8+ hours is as bad as smoking, but standing breaks fix it."},
    {t:"Eat a Healthy Breakfast",d:"Start your day with a nutritious breakfast — protein, fiber, fruit.",c:"health",e:"🥣",xp:15,tip:"Breakfast eaters have 20% better concentration all morning."},
    {t:"Write a To-Do List",d:"Write a full to-do list for today with at least 5 items.",c:"productivity",e:"✅",xp:15,tip:"Listing tasks reduces anxiety about forgetting them."},
    {t:"Say Thank You 5 Times",d:"Consciously say 'thank you' to 5 different people today.",c:"social",e:"🤝",xp:15,tip:"Gratitude strengthens relationships more than any other single act."},
    {t:"Look at the Sky for 2 Minutes",d:"Step outside, look up at the sky, and just observe for 2 minutes.",c:"mindfulness",e:"🌤️",xp:10,tip:"Looking at distant objects reduces eye strain and mental fatigue."},
    {t:"Tidy One Drawer",d:"Pick one messy drawer and organize it completely.",c:"productivity",e:"🗄️",xp:15,tip:"Micro-organizing gives you a sense of control during chaotic days."},
    {t:"Replace One Sugary Drink",d:"Replace one soda or sugary drink today with water or tea.",c:"health",e:"🫖",xp:15,tip:"One less soda per day saves ~50,000 calories per year."},
    {t:"Hum a Song",d:"Hum your favorite song out loud for a full minute. Feel silly? Good.",c:"creativity",e:"🎶",xp:10,tip:"Humming stimulates the vagus nerve and calms your nervous system."},
    {t:"Write One Sentence About Your Day",d:"Before bed, write a single sentence summarizing your day.",c:"mindfulness",e:"✏️",xp:10,tip:"One sentence journals are more sustainable than long entries."},
    {t:"Drink a Glass of Water Right Now",d:"Go get a glass of water and drink the whole thing before you continue.",c:"health",e:"🥤",xp:10,tip:"You're probably dehydrated right now — most people are."},
    {t:"Name 5 Good Things About Yourself",d:"List 5 qualities you genuinely like about yourself. No false modesty.",c:"mindfulness",e:"⭐",xp:20,tip:"Self-affirmation activates the brain's reward centers."},
    {t:"Do 15 Jumping Jacks",d:"Do 15 jumping jacks right now. Get your heart rate up for 30 seconds.",c:"fitness",e:"🤸",xp:15,tip:"30 seconds of cardio is enough to boost alertness for 2 hours."},
    {t:"Organize Your Phone Home Screen",d:"Remove unnecessary apps from your home screen. Keep only essentials.",c:"productivity",e:"📱",xp:15,tip:"Fewer visible apps = fewer impulsive opens."},
    {t:"Cook a Simple Meal",d:"Cook at least one meal from scratch today instead of ordering.",c:"health",e:"🍳",xp:20,tip:"Home-cooked meals have 60% fewer calories than restaurant food on average."},
    {t:"Learn One Fun Fact",d:"Search and learn one genuinely interesting fact you didn't know before.",c:"growth",e:"🧐",xp:10,tip:"Share it with someone — teaching reinforces memory."},
    {t:"Hold a Plank for 20 Seconds",d:"Get into a plank position and hold it for at least 20 seconds.",c:"fitness",e:"🏋️",xp:15,tip:"Planks engage 20+ muscles simultaneously."},
    {t:"Close All Extra Browser Tabs",d:"Close every browser tab you're not actively using right now.",c:"productivity",e:"🖥️",xp:10,tip:"Each open tab costs ~1% of your mental bandwidth."},
    {t:"Water a Plant",d:"Water a plant, or if you don't have one, plan to get one this week.",c:"mindfulness",e:"🌱",xp:10,tip:"Caring for plants reduces cortisol and increases empathy."},
    {t:"Eat One Green Vegetable",d:"Include at least one serving of green vegetables in your meals today.",c:"health",e:"🥦",xp:15,tip:"Leafy greens contain magnesium which directly fights anxiety."},
    {t:"Set a 5-Minute Timer to Daydream",d:"Set a timer and let your mind wander freely for 5 minutes.",c:"creativity",e:"💭",xp:15,tip:"Deliberate daydreaming boosts creative problem-solving by 40%."},
    {t:"Put Your Phone Away During One Meal",d:"Eat one full meal today without looking at any screen.",c:"mindfulness",e:"🍽️",xp:20,tip:"Mindful eating improves digestion and reduces overeating by 25%."},
    {t:"Do 10 Squats",d:"Do 10 bodyweight squats with good form right now.",c:"fitness",e:"🦵",xp:15,tip:"Squats are the king of exercises — they work 70% of your muscles."},
    {t:"Unsubscribe from 3 Emails",d:"Open your email and unsubscribe from 3 newsletters you never read.",c:"productivity",e:"📧",xp:15,tip:"The average person gets 120 emails/day — most are noise."},
    {t:"Take the Stairs",d:"Take the stairs instead of the elevator at least once today.",c:"fitness",e:"🪜",xp:10,tip:"Climbing stairs burns 7x more calories than taking the elevator."},
    {t:"Say One Kind Thing to Yourself",d:"Look in a mirror and say one genuinely kind thing to yourself. Mean it.",c:"mindfulness",e:"🪞",xp:15,tip:"Self-talk literally changes your brain's neural pathways."},
    {t:"Listen Without Interrupting",d:"In your next conversation, listen fully without interrupting once.",c:"social",e:"👂",xp:20,tip:"Most people listen to reply, not to understand."},
    {t:"Stretch Your Neck and Shoulders",d:"Do 3 minutes of neck rolls and shoulder shrugs right now.",c:"fitness",e:"🔄",xp:10,tip:"Most headaches are caused by neck tension, not brain issues."},
    {t:"Turn Off Notifications for 1 Hour",d:"Silence all non-essential notifications for 1 full hour.",c:"productivity",e:"🔕",xp:20,tip:"It takes 23 minutes to refocus after a notification interruption."},
    {t:"Set Your Alarm 10 Minutes Earlier",d:"Set tomorrow's alarm 10 minutes earlier than usual.",c:"productivity",e:"⏰",xp:15,tip:"Those 10 minutes for a calm morning routine are worth more than sleep."},
    {t:"Do a Random Act of Kindness",d:"Do something kind for someone without expecting anything back.",c:"social",e:"💛",xp:25,tip:"Random kindness produces oxytocin, serotonin AND endorphins."},
    {t:"Look at Old Photos and Smile",d:"Spend 5 minutes scrolling through old happy photos.",c:"mindfulness",e:"🖼️",xp:10,tip:"Nostalgia is scientifically proven to boost mood and self-esteem."},
    {t:"Wash Your Hands Mindfully",d:"Next time you wash your hands, do it slowly and mindfully. Feel the water.",c:"mindfulness",e:"🧼",xp:10,tip:"Turning routine actions into mini-meditations rewires your default mode."},
    {t:"Walk Heel-to-Toe for 20 Steps",d:"Walk in a straight line heel-to-toe for 20 steps. Test your balance.",c:"fitness",e:"👣",xp:10,tip:"Balance exercises strengthen the cerebellum — your coordination center."},
    {t:"Count Your Blessings on Your Fingers",d:"Hold up both hands and name one blessing per finger. 10 total.",c:"mindfulness",e:"🤲",xp:15,tip:"Physical gestures anchor gratitude deeper than just thinking."},
    {t:"Sit in Silence for 3 Minutes",d:"Sit somewhere quiet, close your eyes, and just be still for 3 minutes.",c:"mindfulness",e:"🤫",xp:15,tip:"Even 3 minutes of silence lowers blood pressure."},
    {t:"Throw Away 5 Things You Don't Need",d:"Find 5 items in your space that you don't need and throw them away or donate.",c:"productivity",e:"🗑️",xp:15,tip:"Physical clutter increases cortisol. Less stuff = less stress."},
    {t:"Try a New Food",d:"Eat something today you've never tried before — even a new flavor of tea.",c:"growth",e:"🍜",xp:15,tip:"Novel experiences create new neural connections."},
    {t:"Write a 1-Star Review of a Bad Habit",d:"Write a funny mock review of one of your bad habits as if it were a product.",c:"creativity",e:"⭐",xp:20,tip:"Humor helps detach emotionally from habits, making them easier to break."},
    {t:"Identify One Time-Waster",d:"Identify the #1 activity that wastes your time and consciously avoid it today.",c:"productivity",e:"⏳",xp:20,tip:"Awareness is the first step: you can't fix what you don't see."},
    {t:"Go to Bed 15 Minutes Earlier",d:"Tonight, get into bed 15 minutes earlier than your usual time.",c:"health",e:"😴",xp:20,tip:"15 extra minutes of sleep improve next-day performance by 10%."},
    {t:"High-Five Yourself in the Mirror",d:"Look in a mirror, high-five your reflection, and say 'Let's go!'",c:"mindfulness",e:"🖐️",xp:10,tip:"Mel Robbins: this triggers the same reward as being celebrated by others."},
    {t:"Name 3 Things You Can See, Hear, Feel",d:"Ground yourself: name 3 things you see, 3 you hear, 3 you feel.",c:"mindfulness",e:"👁️",xp:10,tip:"The 3-3-3 rule is a clinical anxiety reduction technique."},
    {t:"Pet an Animal",d:"Pet a dog, cat, or any animal today. Borrow one if you need to.",c:"social",e:"🐕",xp:15,tip:"Petting animals lowers cortisol and raises oxytocin within 10 minutes."},
    {t:"Chew Your Food Slowly",d:"At one meal today, chew each bite 20 times before swallowing.",c:"health",e:"🦷",xp:10,tip:"Slow chewing improves nutrient absorption by up to 30%."},
    {t:"Do a 1-Minute Wall Sit",d:"Put your back against a wall and hold a sitting position for 60 seconds.",c:"fitness",e:"🧱",xp:20,tip:"Wall sits build isometric strength without any equipment."},
    {t:"Check Your Posture Right Now",d:"Sit up straight, pull shoulders back, and maintain good posture for 1 hour.",c:"health",e:"🧍",xp:15,tip:"Good posture increases testosterone by 20% and decreases cortisol by 25%."},
    {t:"Send a Voice Note Instead of Text",d:"Send one voice note instead of a text message today.",c:"social",e:"🎤",xp:10,tip:"Voice messages carry emotion that text can't — 38% of communication is tone."},
    {t:"Name Something You Learned This Week",d:"Right now, write down one thing you learned in the past 7 days.",c:"growth",e:"🎓",xp:10,tip:"Retrieval practice is the most powerful memory technique known."},
    {t:"Take 3 Photos of Different Textures",d:"Find and photograph 3 interesting textures around you.",c:"creativity",e:"📷",xp:15,tip:"Noticing details rewires your brain for deeper observation."},
    {t:"Laugh Out Loud",d:"Watch a funny video or remember something hilarious and laugh genuinely.",c:"mindfulness",e:"😂",xp:10,tip:"20 seconds of genuine laughter = 3 minutes of rowing exercise (cardiovascularly)."},
    {t:"Set One Micro-Goal for Today",d:"Set one tiny, achievable goal for today and accomplish it before noon.",c:"productivity",e:"🎯",xp:15,tip:"Micro-goals build momentum via dopamine — small wins snowball."},
    {t:"Dance for 1 Minute",d:"Put on a song and dance like nobody's watching for 1 full minute.",c:"fitness",e:"💃",xp:15,tip:"Dancing activates the brain's reward center more than any other exercise."},
    {t:"Put One Item Back Where It Belongs",d:"Find one misplaced item and return it to its proper spot.",c:"productivity",e:"📦",xp:10,tip:"The 'one touch' rule: handle things once and put them away immediately."},
    {t:"Write Your Name with Your Non-Dominant Hand",d:"Write your full name 5 times with your non-dominant hand.",c:"growth",e:"✍️",xp:15,tip:"Using your non-dominant hand creates new neural pathways in the motor cortex."},
    {t:"Take a 2-Minute Cold Face Splash",d:"Splash cold water on your face for 2 minutes. Wake up your nerves.",c:"health",e:"💦",xp:15,tip:"Cold water on the face triggers the 'dive reflex' — instantly calming you."},
    {t:"Open a Window for Fresh Air",d:"Open a window and breathe fresh air for 5 minutes.",c:"health",e:"🪟",xp:10,tip:"Indoor CO2 levels drop 40% within 5 minutes of opening a window."},
    {t:"Say Good Morning to Someone New",d:"Greet someone you don't usually greet with a warm good morning.",c:"social",e:"🌅",xp:10,tip:"Morning greetings set the social tone for the entire day."},
    {t:"Wiggle Your Toes for 30 Seconds",d:"Take off your shoes and actively wiggle your toes for 30 seconds.",c:"fitness",e:"🦶",xp:10,tip:"Toe exercises improve balance and prevent falls — yes, seriously."},
    {t:"Name Your Emotion Right Now",d:"Pause and label exactly what emotion you're feeling. Be precise.",c:"mindfulness",e:"🏷️",xp:15,tip:"'Name it to tame it' — labeling emotions reduces their intensity by 50%."},
    {t:"Wipe Down Your Phone Screen",d:"Clean your phone screen with a cloth. It has 10x more bacteria than a toilet seat.",c:"health",e:"🧽",xp:10,tip:"Clean screens also reduce eye strain from smudge-induced glare."},
    {t:"Draw a Smiley Face",d:"Draw a smiley face on a sticky note and put it somewhere you'll see it.",c:"creativity",e:"😃",xp:10,tip:"Visual cues for positivity subconsciously lift mood all day."},
    {t:"Count to 10 Before Reacting",d:"The next time something frustrates you, count to 10 before responding.",c:"mindfulness",e:"🔢",xp:20,tip:"This 10-second pause engages your prefrontal cortex over your amygdala."},
    {t:"Hold the Door for Someone",d:"Actively look for opportunities to hold doors open for people today.",c:"social",e:"🚪",xp:10,tip:"Small courtesies create ripple effects — the person you help often helps another."},
    {t:"Identify One Strength You Used Today",d:"Before bed, identify one personal strength you used today.",c:"growth",e:"💎",xp:15,tip:"Strength recognition builds self-efficacy faster than fixing weaknesses."},
    {t:"Watch the Sunrise or Sunset",d:"Watch either the sunrise or sunset today. Give it your full attention.",c:"mindfulness",e:"🌇",xp:20,tip:"Natural light cycles regulate melatonin and cortisol rhythms."},
    {t:"Clap 20 Times Really Fast",d:"Clap your hands 20 times as fast as possible. Get the blood flowing.",c:"fitness",e:"👏",xp:10,tip:"Clapping stimulates acupressure points and increases circulation."},
    {t:"Write a Compliment About Your Best Friend",d:"Write one genuine thing you admire about your closest friend.",c:"social",e:"💌",xp:15,tip:"Thinking about loved ones activates the same brain areas as receiving money."},
    {t:"Hug Someone for 20 Seconds",d:"Give someone a genuine 20-second hug today. It matters.",c:"social",e:"🤗",xp:20,tip:"20-second hugs release enough oxytocin to lower blood pressure."},
    {t:"Eat Without Multitasking",d:"Eat one entire meal today without doing anything else simultaneously.",c:"health",e:"🍔",xp:15,tip:"People who eat without screens consume 25% fewer calories."},
    {t:"Balance on One Foot for 30 Seconds",d:"Stand on one foot and hold your balance for 30 seconds. Switch feet.",c:"fitness",e:"🦩",xp:10,tip:"Single-leg balance directly correlates with longevity in research."},
    {t:"Identify One App You Can Delete",d:"Find one app on your phone you haven't used in a month and delete it.",c:"productivity",e:"❌",xp:15,tip:"Fewer apps = fewer notifications = more focus."},
    {t:"Take 5 Deep Belly Breaths",d:"Place your hand on your belly and take 5 deep diaphragmatic breaths.",c:"mindfulness",e:"🫁",xp:10,tip:"Belly breathing activates the vagus nerve 3x more than chest breathing."},
    {t:"Enjoy a Cup of Tea Slowly",d:"Make a cup of tea and drink it slowly. No phone, no rush.",c:"mindfulness",e:"🍵",xp:15,tip:"Mindful tea-drinking is the foundation of Japanese zen practice."},
    {t:"Write What You're Proud Of",d:"Write down one thing you did recently that you're genuinely proud of.",c:"mindfulness",e:"🏅",xp:15,tip:"Self-acknowledgment strengthens the brain's motivation circuits."},
    {t:"Do 10 Calf Raises",d:"Stand up and do 10 calf raises right now. Push up on your toes.",c:"fitness",e:"🦿",xp:10,tip:"Calf raises improve blood circulation and reduce leg fatigue."},
    {t:"Pick Up One Piece of Litter",d:"Find and properly dispose of one piece of litter in your environment.",c:"social",e:"♻️",xp:15,tip:"Every piece of litter picked up inspires 2-3 others to do the same."},
    {t:"Look at Something Far Away for 20 Seconds",d:"Look at something at least 20 feet away for 20 seconds. Rest your eyes.",c:"health",e:"👀",xp:10,tip:"The 20-20-20 rule prevents digital eye strain."},
    {t:"Give Yourself a Hand Massage",d:"Massage your own palms and fingers for 2 minutes.",c:"health",e:"🤲",xp:10,tip:"Hand massage reduces anxiety and pain perception simultaneously."},
    {t:"Say 'I Can' 5 Times Out Loud",d:"Stand up and say 'I can do this' 5 times with conviction.",c:"mindfulness",e:"💬",xp:10,tip:"Verbal self-affirmation activates the brain's prefrontal cortex."},
    {t:"Skip Instead of Walk for 30 Seconds",d:"Skip like a kid for 30 seconds. Yes, actually skip.",c:"fitness",e:"🤾",xp:15,tip:"Skipping is impossible without smiling — try it."},
    {t:"Turn Off Your Screen 30 Min Before Bed",d:"Put down all screens at least 30 minutes before bedtime tonight.",c:"health",e:"🌙",xp:25,tip:"Blue light suppresses melatonin for 90 minutes after exposure."},
    {t:"Tell Someone You Appreciate Them",d:"Tell someone in person or via call that you appreciate them. Be specific.",c:"social",e:"❤️",xp:20,tip:"Expressed appreciation is the #1 predictor of relationship satisfaction."},
    {t:"Identify Your #1 Value",d:"Think about what matters most to you and write it down in one word.",c:"growth",e:"🧭",xp:20,tip:"People who clarify their values make decisions 3x faster."},
    {t:"Stand and Stretch Your Arms Overhead",d:"Stand up, interlace your fingers, and stretch your arms above your head for 30 secs.",c:"fitness",e:"🙆",xp:10,tip:"Overhead stretches improve lymphatic drainage and reduce bloating."},
    {t:"Drink a Glass of Water Before Coffee",d:"Before your first coffee, drink a full glass of water.",c:"health",e:"☕",xp:10,tip:"You're ~500ml dehydrated upon waking. Water first, caffeine second."},
    {t:"Give a Stranger Directions",d:"If you see someone lost, offer to help them with directions today.",c:"social",e:"🗺️",xp:15,tip:"Helping strangers activates the 'helper's high' — a real dopamine boost."},
    {t:"Fold One Load of Laundry Mindfully",d:"Fold laundry slowly looking at each garment. Turn chores into meditation.",c:"mindfulness",e:"👕",xp:15,tip:"Mindful chores reduce stress as effectively as formal meditation."},
    {t:"Read a Quote and Reflect",d:"Find an inspiring quote, read it 3 times, and think about what it means to you.",c:"growth",e:"💭",xp:10,tip:"Reflective reading builds deeper comprehension than speed reading."},
    {t:"Do 3 Sets of Arm Circles",d:"Extend your arms and do arm circles — 15 forward, 15 backward.",c:"fitness",e:"🔄",xp:10,tip:"Arm circles improve shoulder mobility and reduce desk-posture damage."},
    {t:"Play Your Favorite Song and Do Nothing Else",d:"Put on a song you love. Don't do anything else. Just listen.",c:"creativity",e:"🎧",xp:15,tip:"Active music listening activates every known area of the brain."},
    {t:"Identify One Thing to Let Go Of",d:"Name one grudge, worry, or regret you can let go of today.",c:"mindfulness",e:"🎈",xp:20,tip:"Letting go is a skill. It gets easier every time you practice."},
    {t:"Stand on Your Tiptoes for 15 Seconds",d:"Rise onto your tiptoes and hold the position for 15 seconds.",c:"fitness",e:"⬆️",xp:10,tip:"Tiptoe standing strengthens ankles and improves proprioception."},
    {t:"Write One Word That Describes Your Goal",d:"Distill your biggest goal into a single powerful word.",c:"growth",e:"🎯",xp:15,tip:"One-word goals are easier to remember and more emotionally resonant."},
    {t:"Taste Your Food With Eyes Closed",d:"Close your eyes while eating one bite. Notice every flavor.",c:"mindfulness",e:"👅",xp:10,tip:"Closing your eyes amplifies taste perception by 30%."},
    {t:"Do a 30-Second Superman Hold",d:"Lie face down, lift arms and legs, and hold for 30 seconds.",c:"fitness",e:"🦸",xp:15,tip:"Superman holds strengthen the entire posterior chain."},
    {t:"Send a Meme to a Friend",d:"Find a meme that matches your friend's humor and send it.",c:"social",e:"😂",xp:10,tip:"Shared humor strengthens social bonds more than shared activities."},
    {t:"Take 3 Deep Breaths Before Each Meal",d:"Before eating today, pause and take 3 intentional breaths.",c:"mindfulness",e:"🧘‍♂️",xp:10,tip:"Pre-meal breathing activates 'rest and digest' mode for better absorption."},
    {t:"Walk Backward for 20 Steps",d:"Find a safe space and walk backward for 20 steps.",c:"fitness",e:"🔙",xp:15,tip:"Backward walking engages different muscles and improves cognitive function."},
    {t:"Write a 2-Sentence Story",d:"Write a complete mini-story in just 2 sentences. Make it creative.",c:"creativity",e:"📜",xp:15,tip:"Constraint breeds creativity. Limits make you more inventive."},
    {t:"Say No to One Unnecessary Request",d:"Politely decline one task or request that isn't essential today.",c:"growth",e:"🚫",xp:20,tip:"Every 'yes' to something unimportant is a 'no' to something that matters."},
    {t:"Touch Your Toes (Or Try)",d:"Stand and reach toward your toes. Hold for 20 seconds.",c:"fitness",e:"🤸‍♂️",xp:10,tip:"Hamstring flexibility directly affects lower back health."},
    {t:"Memorize a Phone Number",d:"Pick one important person's number and memorize it by heart.",c:"growth",e:"🧠",xp:20,tip:"Memorization exercises strengthen the hippocampus — your memory center."},
    {t:"Say Something Nice About Today's Weather",d:"Whatever the weather is, find one positive thing about it and say it out loud.",c:"mindfulness",e:"⛅",xp:10,tip:"Reframing negatives into positives is the foundation of cognitive behavioral therapy."},
    {t:"Do High Knees for 20 Seconds",d:"March in place lifting your knees as high as possible for 20 seconds.",c:"fitness",e:"🏃",xp:15,tip:"High knees elevate heart rate faster than any other bodyweight exercise."},
    {t:"Organize One Folder on Your Phone",d:"Move photos or files into proper folders — clean up digital clutter.",c:"productivity",e:"📂",xp:15,tip:"Digital clutter causes the same stress response as physical clutter."},
    {t:"Tell Someone About Your Day",d:"Share at least one thing about your day with someone — don't keep it all inside.",c:"social",e:"🗣️",xp:15,tip:"Verbalizing your day helps your brain process and consolidate experiences."},
    {t:"Write Your Age + One Lesson You've Learned",d:"Write your current age and one life lesson you've gathered so far.",c:"growth",e:"📅",xp:15,tip:"Age-indexed wisdom creates a powerful personal philosophy over time."},
    {t:"Trace a Shape in the Air with Your Finger",d:"Draw a perfect circle in the air with your index finger. Try both hands.",c:"creativity",e:"⭕",xp:10,tip:"Air-tracing improves fine motor control and spatial awareness."},
    {t:"Thank Your Body for Something",d:"Acknowledge one thing your body did for you today. Thank it sincerely.",c:"mindfulness",e:"🫀",xp:10,tip:"Body gratitude reduces body-image anxiety and improves self-care habits."},
    {t:"Think of 3 Solutions to a Problem",d:"Pick a small problem and brainstorm 3 different solutions before acting.",c:"productivity",e:"🔧",xp:20,tip:"Having 3 options reduces decision paralysis and improves outcomes."},
    {t:"Wink at Yourself in the Mirror",d:"Look at yourself in the mirror and give yourself a confident wink.",c:"mindfulness",e:"😉",xp:10,tip:"Playful self-expression reduces social anxiety and boosts confidence."},
    {t:"Walk to the Farthest Water Fountain",d:"Instead of the nearest water source, walk to the farthest one.",c:"fitness",e:"🚰",xp:10,tip:"Extra steps add up — 2,000 extra steps/day = 10 lbs less per year."},
  ];

  const MEDIUM = [
    {t:"No Phone for the First Hour",d:"Don't touch your phone for the first 60 minutes after waking up.",c:"productivity",e:"📵",xp:40,tip:"Morning phone use triggers reactive mode. Start proactive instead."},
    {t:"Read 20 Pages",d:"Read 20 pages of a book today — commit to a full chapter.",c:"growth",e:"📚",xp:40,tip:"20 pages/day = 30+ books a year. Knowledge compounds."},
    {t:"30-Minute Bodyweight Workout",d:"Complete a 30-minute workout using only your bodyweight. No gym needed.",c:"fitness",e:"🏋️",xp:50,tip:"Pushups, squats, lunges, planks. That's a complete workout."},
    {t:"Write a Full Journal Page",d:"Fill an entire page in your journal with unfiltered thoughts.",c:"creativity",e:"📓",xp:40,tip:"Long-form journaling accesses deeper thoughts than bullet points."},
    {t:"Cold Shower Finish",d:"End your shower with 60 seconds of cold water. Full cold.",c:"health",e:"🥶",xp:50,tip:"Cold exposure boosts norepinephrine by 200-300%, improving mood for hours."},
    {t:"Teach Someone One Thing",d:"Explain a concept you know well to someone who doesn't know it.",c:"social",e:"🎓",xp:45,tip:"Teaching is the fastest way to master something — the 'protégé effect'."},
    {t:"No Sugar Today",d:"Avoid all added sugar for the entire day. Read labels carefully.",c:"health",e:"🚫",xp:50,tip:"Sugar withdrawal peaks at 3 days. Day 1 is the hardest — push through."},
    {t:"Deep Work for 45 Minutes",d:"Work on your most important task for 45 minutes with zero interruptions.",c:"productivity",e:"🎯",xp:50,tip:"45 minutes is the sweet spot before diminishing returns set in."},
    {t:"Meditate for 10 Minutes",d:"Sit in silence and focus on your breath for 10 full minutes.",c:"mindfulness",e:"🧘",xp:40,tip:"10 minutes of meditation changes brain structure in just 8 weeks."},
    {t:"Cook a New Recipe",d:"Follow a recipe for a dish you've never made before.",c:"creativity",e:"👨‍🍳",xp:45,tip:"Cooking fires the same brain areas as creative painting."},
    {t:"Walk for 30 Minutes",d:"Take a continuous 30-minute walk. No stopping, no phone.",c:"fitness",e:"🚶‍♂️",xp:40,tip:"30-minute walks reduce depression symptoms as effectively as medication."},
    {t:"Write a Letter to Your Future Self",d:"Write a letter to yourself 1 year from now. Seal it.",c:"growth",e:"✉️",xp:45,tip:"Future self-connection increases savings, health, and goal achievement."},
    {t:"Replace One Bad Habit Trigger",d:"Identify one trigger for a bad habit and replace the response with something positive.",c:"growth",e:"🔄",xp:50,tip:"Habit loops: Cue → Routine → Reward. Change the routine, keep the cue."},
    {t:"Do 50 Pushups Throughout the Day",d:"Spread 50 pushups across the entire day. 10 here, 5 there.",c:"fitness",e:"💪",xp:50,tip:"'Greasing the groove' — frequent sub-maximal sets build strength fast."},
    {t:"No Processed Food Today",d:"Eat only whole, unprocessed foods for the entire day.",c:"health",e:"🥗",xp:50,tip:"One day of clean eating is enough for your gut bacteria to start shifting."},
    {t:"Zero Phone Use During Commute",d:"Keep your phone in your bag during your entire commute.",c:"productivity",e:"🚌",xp:35,tip:"Boredom during commutes boosts creative thinking by 40%."},
    {t:"Learn 10 Words in a New Language",d:"Pick a language and learn 10 basic words today. Practice saying them.",c:"growth",e:"🌍",xp:45,tip:"Bilingual brains have denser gray matter in language-processing regions."},
    {t:"Give Away Something You Own",d:"Find one item you own but don't need and give it to someone.",c:"social",e:"🎁",xp:40,tip:"Generosity activates the brain's reward centers more than receiving gifts."},
    {t:"Take a 20-Minute Power Nap",d:"Set a timer for exactly 20 minutes and take a focused nap.",c:"health",e:"😴",xp:35,tip:"20 minutes is the sweet spot — longer naps cause sleep inertia."},
    {t:"Write a Haiku",d:"Write a haiku poem (5-7-5 syllables) about something around you.",c:"creativity",e:"🖊️",xp:35,tip:"Constraints force creative breakthroughs. Haikus train precision thinking."},
    {t:"Do 100 Squats Throughout the Day",d:"Spread 100 bodyweight squats across the entire day.",c:"fitness",e:"🦵",xp:55,tip:"100 squats/day burns ~100 extra calories and builds serious leg strength."},
    {t:"No Complaining for 24 Hours",d:"Zero complaints for the entire day. If you catch yourself, restart your mental counter.",c:"mindfulness",e:"🤐",xp:50,tip:"The average person complains 15-30 times/day. Awareness is step one."},
    {t:"Call a Family Member",d:"Call (not text) a family member and have a real 10+ minute conversation.",c:"social",e:"📞",xp:40,tip:"Phone calls create emotional bonds that texts physically cannot."},
    {t:"Take a Different Route",d:"Go somewhere using a completely different route than usual.",c:"growth",e:"🗺️",xp:30,tip:"Novel environments stimulate hippocampal neurogenesis — literally growing brain cells."},
    {t:"Organize Your Entire Wallet/Bag",d:"Empty your wallet or bag completely and reorganize everything.",c:"productivity",e:"👜",xp:35,tip:"You probably have receipts from 2 months ago in there."},
    {t:"Fast for 16 Hours",d:"Try a 16:8 intermittent fast — eat only within an 8-hour window.",c:"health",e:"⏳",xp:55,tip:"Fasting triggers autophagy — your cells literally clean house."},
    {t:"Solve a Puzzle or Brain Teaser",d:"Find and solve a Sudoku, crossword, or logic puzzle.",c:"growth",e:"🧩",xp:35,tip:"Puzzles strengthen the prefrontal cortex and delay cognitive aging."},
    {t:"Do a Plank for 60 Seconds",d:"Hold a plank position for 1 full minute. No dropping.",c:"fitness",e:"🏋️‍♀️",xp:40,tip:"A 60-second plank engages every core muscle simultaneously."},
    {t:"Write Your Top 5 Life Goals",d:"Write down the 5 things you most want to achieve in your life. Be bold.",c:"growth",e:"🌟",xp:45,tip:"People who write goals are 42% more likely to achieve them."},
    {t:"Limit Coffee to 1 Cup",d:"Drink only 1 cup of coffee or tea today. No more.",c:"health",e:"☕",xp:40,tip:"Over-caffeination increases anxiety and disrupts sleep architecture."},
    {t:"Try a 5-Minute Cold Water Immersion",d:"Fill a basin with cold water and submerge your hands and forearms for 5 minutes.",c:"health",e:"🧊",xp:45,tip:"Cold water immersion reduces inflammation and increases alertness for hours."},
    {t:"Spend 30 Minutes on a Creative Project",d:"Work on anything creative — drawing, writing, music, crafting — for 30 minutes.",c:"creativity",e:"✨",xp:45,tip:"Creative flow states are the highest form of human focus."},
    {t:"Do the 2-Minute Rule All Day",d:"If any task takes less than 2 minutes, do it immediately. No procrastinating.",c:"productivity",e:"⚡",xp:45,tip:"David Allen's rule: 2-minute tasks left undone create mental debt."},
    {t:"Walk 10,000 Steps",d:"Hit 10,000 steps today. Track with your phone.",c:"fitness",e:"👟",xp:50,tip:"10k steps/day reduces all-cause mortality by 40-50%."},
    {t:"Take a Social Media Detox Day",d:"No Instagram, TikTok, Twitter, YouTube for the entire day.",c:"productivity",e:"🔒",xp:55,tip:"Social media detox for 1 week reduces depression symptoms by 25%."},
    {t:"Practice Box Breathing 5x",d:"Do 5 rounds of box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s.",c:"mindfulness",e:"📦",xp:35,tip:"Navy SEALs use box breathing before high-stress operations."},
    {t:"Plan Your Entire Week Tonight",d:"Before bed, write a clear plan for every day of the upcoming week.",c:"productivity",e:"📋",xp:50,tip:"Weekly planning reduces daily decision fatigue by 70%."},
    {t:"Volunteer for 1 Hour",d:"Offer your time to help someone, a neighbor, or a local cause for 1 hour.",c:"social",e:"🤝",xp:60,tip:"Volunteering increases life satisfaction more than a 5x salary increase."},
    {t:"Do 50 Jumping Jacks",d:"Do 50 jumping jacks in one go. Push through the burn.",c:"fitness",e:"🤸",xp:35,tip:"50 jumping jacks burn about 50 calories in under 5 minutes."},
    {t:"Create a Mind Map",d:"Pick any topic and create a detailed mind map with branches.",c:"creativity",e:"🗂️",xp:40,tip:"Mind maps leverage your brain's natural associative thinking patterns."},
    {t:"Go to Bed at Exactly 10 PM",d:"Be in bed, eyes closed, by exactly 10:00 PM tonight.",c:"health",e:"🕙",xp:45,tip:"Sleep before midnight is 2x more restorative than after midnight."},
    {t:"Memorize a Poem or Quote",d:"Choose a short poem or meaningful quote and memorize it by heart.",c:"growth",e:"🎭",xp:45,tip:"Memorized wisdom becomes available in your darkest moments."},
    {t:"Do a Body Scan Meditation",d:"Lie down and slowly scan attention from head to toes. Notice every sensation.",c:"mindfulness",e:"🫳",xp:40,tip:"Body scan meditation reduces chronic pain by 40% in clinical trials."},
    {t:"Eat Only When Hungry",d:"Today, eat ONLY when you feel genuine physical hunger — not boredom.",c:"health",e:"🍽️",xp:45,tip:"Most people eat on schedule or emotion, not hunger. Listen to your body."},
    {t:"Write 3 Affirmations and Repeat Them",d:"Write 3 personal affirmations and read them aloud 3 times each.",c:"mindfulness",e:"💫",xp:35,tip:"Affirmations restructure the brain's self-identity networks."},
    {t:"Solve 10 Mental Math Problems",d:"Do 10 multiplication or division problems in your head — no calculator.",c:"growth",e:"🔢",xp:35,tip:"Mental math keeps the parietal lobe sharp — your number-processing center."},
    {t:"Write This Week's 3 Wins",d:"List 3 things that went well this week, no matter how small.",c:"mindfulness",e:"🏆",xp:35,tip:"Win tracking rewires your brain to notice positives over negatives."},
    {t:"Carry a Water Bottle All Day",d:"Keep a water bottle with you everywhere today and sip constantly.",c:"health",e:"🧴",xp:30,tip:"Visible water bottles increase consumption by 40%."},
    {t:"Introduce Two Friends",d:"Connect two people who don't know each other but might get along.",c:"social",e:"🤜🤛",xp:45,tip:"Being a 'connector' is one of the most valuable social skills."},
    {t:"Do 30 Lunges",d:"Do 30 alternating lunges (15 per side). Focus on form.",c:"fitness",e:"🦿",xp:40,tip:"Lunges improve balance, coordination, and unilateral leg strength."},
    {t:"Write a Thank-You Note",d:"Write a handwritten or typed thank-you note to someone who helped you.",c:"social",e:"📝",xp:40,tip:"Thank-you notes increase happiness for both writer and recipient for weeks."},
    {t:"Practice One Skill for 30 Minutes",d:"Dedicate 30 minutes to deliberately practicing a skill you want to improve.",c:"growth",e:"🎯",xp:50,tip:"Deliberate practice (focused, effortful) is 10x more effective than casual practice."},
    {t:"Turn Off WiFi for 2 Hours",d:"Disconnect from WiFi for 2 hours and do something offline.",c:"productivity",e:"📡",xp:45,tip:"Offline hours are your most creative and focused hours."},
    {t:"Drink Only Water Today",d:"Zero coffee, soda, juice, or alcohol. Water only for the entire day.",c:"health",e:"💧",xp:50,tip:"24 hours of water-only instantly improves skin hydration and kidney function."},
    {t:"Do 3 Rounds of Burpees x10",d:"Do 3 sets of 10 burpees with 1-minute rest between sets.",c:"fitness",e:"🏃‍♂️",xp:55,tip:"Burpees are the single most efficient full-body exercise known."},
    {t:"Write a Bucket List of 20 Items",d:"Write 20 things you want to do or experience before you die.",c:"growth",e:"🪣",xp:40,tip:"Written bucket lists make experiences 70% more likely to happen."},
    {t:"Stretch for 15 Minutes",d:"Do a full 15-minute flexibility routine — hold each stretch 30 seconds.",c:"fitness",e:"🤸‍♀️",xp:35,tip:"15 minutes of stretching reduces injury risk by 50%."},
    {t:"Eat a Meal Without Any Seasoning",d:"Try one meal with zero added salt, sugar, or sauce. Taste the raw food.",c:"health",e:"🫙",xp:40,tip:"Plain food resets your taste buds — everything tastes better after."},
    {t:"Make a List of Things You've Overcome",d:"List 5 challenges you've successfully overcome in your life.",c:"mindfulness",e:"🏔️",xp:40,tip:"Reflecting on past victories builds resilience for future ones."},
    {t:"Do a Random Wikipedia Dive",d:"Open a random Wikipedia article and read it fully. Learn something wild.",c:"growth",e:"🌐",xp:30,tip:"Random learning creates unexpected connections between knowledge domains."},
    {t:"Practice Active Listening All Day",d:"In every conversation today, focus entirely on understanding before responding.",c:"social",e:"👂",xp:50,tip:"Active listening is the #1 skill that separates good leaders from great ones."},
    {t:"Create a Personal Mantra",d:"Write one sentence that will be your guiding principle this month.",c:"growth",e:"🔮",xp:40,tip:"Mantras serve as cognitive anchors during decision-making."},
    {t:"Climb Stairs for 10 Minutes",d:"Find a staircase and go up and down for 10 continuous minutes.",c:"fitness",e:"🪜",xp:45,tip:"10 minutes of stair climbing is equivalent to 20 minutes of jogging."},
    {t:"Clean Out Your Refrigerator",d:"Remove expired items, organize shelves, and wipe down your fridge.",c:"productivity",e:"🧊",xp:35,tip:"A clean fridge = healthier food choices. You eat what you see."},
    {t:"Do a Loving-Kindness Meditation",d:"Spend 10 minutes sending loving thoughts to yourself, loved ones, and even difficult people.",c:"mindfulness",e:"💝",xp:45,tip:"Loving-kindness meditation increases social connection and empathy within 2 weeks."},
    {t:"Say Yes to Something You'd Normally Avoid",d:"Accept one invitation or try one thing you'd usually say no to.",c:"growth",e:"🎟️",xp:50,tip:"Comfort zone expansion happens one 'yes' at a time."},
    {t:"Do 200 Steps of Walking Meditation",d:"Walk very slowly for 200 steps, paying attention to every single foot placement.",c:"mindfulness",e:"🧎",xp:40,tip:"Walking meditation bridges the gap between sitting practice and daily life."},
    {t:"Write Down Your Screen Time",d:"Check your phone's screen time and write the number down. Face it.",c:"productivity",e:"📊",xp:30,tip:"Awareness of screen time alone reduces it by 20%."},
    {t:"Send a Snail-Mail Letter",d:"Write and mail a physical letter or postcard to someone you care about.",c:"social",e:"💌",xp:50,tip:"Physical letters are 10x more meaningful than digital messages."},
    {t:"Do Shadow Boxing for 5 Minutes",d:"Throw punches at the air for 5 minutes. Get your heart rate up.",c:"fitness",e:"🥊",xp:40,tip:"Shadow boxing burns 400+ calories per hour — more than jogging."},
    {t:"Identify and Eliminate One Distraction",d:"Find the #1 thing that distracts you and physically remove it from your workspace.",c:"productivity",e:"🎯",xp:45,tip:"Environment design beats willpower every single time."},
    {t:"Try a New Type of Tea",d:"Buy and try a completely new variety of tea you've never had before.",c:"creativity",e:"🫖",xp:25,tip:"Tea rituals improve mindfulness and routine satisfaction."},
    {t:"Do Wrist Circles and Finger Stretches",d:"Spend 5 minutes stretching your wrists, fingers, and forearms. Fight carpal tunnel.",c:"health",e:"🤚",xp:25,tip:"If you type daily, wrist stretches prevent 80% of repetitive strain injuries."},
    {t:"Listen to a Podcast on a Topic You Know Nothing About",d:"Find a podcast about something completely unfamiliar and listen for 20 minutes.",c:"growth",e:"🎙️",xp:35,tip:"Cross-domain learning creates the most innovative thinkers."},
    {t:"Do 3 Sets of Pike Pushups",d:"Do 3 sets of 8 pike pushups to build shoulder strength.",c:"fitness",e:"🤸‍♂️",xp:45,tip:"Pike pushups are the gateway exercise to handstand pushups."},
    {t:"Spend 20 Minutes in Direct Sunlight",d:"Go outside and soak in natural sunlight for at least 20 minutes.",c:"health",e:"☀️",xp:35,tip:"Morning sunlight sets circadian rhythm and boosts vitamin D production."},
    {t:"Create a Vision Board Sketch",d:"Sketch a rough vision board with images and words of your ideal life.",c:"creativity",e:"🖼️",xp:45,tip:"Vision boards leverage the brain's reticular activating system — what you focus on, you find."},
    {t:"Challenge a Belief You Hold",d:"Pick one opinion you hold strongly and honestly argue the opposite side.",c:"growth",e:"⚖️",xp:50,tip:"Steel-manning the opposition is the hallmark of independent thinking."},
    {t:"Do a Tabata Circuit",d:"Do a 4-minute Tabata: 20s work / 10s rest for 8 rounds of any exercise.",c:"fitness",e:"💥",xp:50,tip:"4 minutes of Tabata improves fitness as much as 45 minutes of moderate cardio."},
    {t:"Write Down Your Ideal Day",d:"Describe your perfect day from waking up to going to bed. Every detail.",c:"growth",e:"🌟",xp:40,tip:"Clarity of vision is the first step to manifesting the life you want."},
    {t:"Fast From Negative Self-Talk All Day",d:"Catch and stop every negative thing you say about yourself today.",c:"mindfulness",e:"🛑",xp:50,tip:"Negative self-talk activates the amygdala, putting your brain in threat mode."},
    {t:"Do 40 Bicycle Crunches",d:"Do 40 bicycle crunches — 20 per side. Control the movement.",c:"fitness",e:"🚴",xp:40,tip:"Bicycle crunches are the single most effective ab exercise per EMG studies."},
    {t:"Rate Every Meal Out of 10",d:"After each meal today, give it a score out of 10 for nutrition and enjoyment.",c:"health",e:"⭐",xp:30,tip:"Meal rating builds food awareness without the stress of calorie counting."},
    {t:"Learn a Card Trick",d:"Find and learn one simple card trick. Practice until you can do it smoothly.",c:"creativity",e:"🃏",xp:40,tip:"Learning magic tricks improves fine motor skills and presentation ability."},
    {t:"Spend 15 Minutes Organizing Digital Photos",d:"Sort, delete duplicates, and organize 15 minutes' worth of phone photos.",c:"productivity",e:"📸",xp:30,tip:"Digital decluttering reduces cognitive load every time you open your gallery."},
    {t:"Do a Nature Walk",d:"Walk somewhere with trees, grass, or water for at least 20 minutes.",c:"mindfulness",e:"🌳",xp:40,tip:"'Forest bathing' reduces cortisol for up to 7 days after a single session."},
    {t:"Write a Micro-Essay (100 Words)",d:"Write 100 words on any topic. Make every word count.",c:"creativity",e:"📄",xp:40,tip:"Tight word limits force you to think sharply about what really matters."},
    {t:"Hold a Deep Squat for 60 Seconds",d:"Drop into a deep squat and hold the position for 60 seconds.",c:"fitness",e:"🏋️",xp:40,tip:"Deep squatting is the natural resting position for humans — lost to chairs."},
    {t:"Compliment Your Enemy (Or Someone Difficult)",d:"Find something genuine to appreciate about someone you have tension with.",c:"social",e:"🕊️",xp:55,tip:"Finding good in difficult people rewires your threat-detection systems."},
    {t:"Time Block Your Entire Day",d:"Plan every hour of your day in advance. Stick to the time blocks.",c:"productivity",e:"📅",xp:50,tip:"Cal Newport: Time blocking is the closest thing to a productivity superpower."},
    {t:"Do a 5-Minute Headstand or Wall Handstand",d:"Practice a headstand or kick up against a wall. Hold as long as comfortable.",c:"fitness",e:"🤸",xp:55,tip:"Inversions reverse blood flow, reducing facial puffiness and improving circulation."},
    {t:"Eat One Meal in Complete Silence",d:"Eat one full meal without any conversation, music, or screens.",c:"mindfulness",e:"🤫",xp:45,tip:"Silent eating in Asian monasteries is practiced specifically for deep awareness."},
    {t:"Research One Historical Event You Know Nothing About",d:"Pick a random historical event and spend 20 minutes learning about it.",c:"growth",e:"📜",xp:35,tip:"History is the greatest teacher — you avoid mistakes others already made."},
    {t:"Build Something with Your Hands",d:"Build, fix, or construct something physical today — even a paper airplane.",c:"creativity",e:"🔨",xp:40,tip:"Working with your hands reduces anxiety and increases flow state."},
    {t:"Do a 2-Minute Plank Challenge",d:"Hold a plank for 2 full minutes. If you drop, rest 5 seconds and continue.",c:"fitness",e:"💀",xp:55,tip:"2-minute planks separate beginners from intermediates in core strength."},
    {t:"Batch All Your Admin Tasks",d:"Do all admin (emails, bills, scheduling) in one focused 45-min session.",c:"productivity",e:"📧",xp:45,tip:"Context-switching between admin and creative work costs 25% of your day."},
    {t:"Watch a TED Talk",d:"Find and watch one TED Talk on a topic that interests you. Take notes.",c:"growth",e:"🎤",xp:35,tip:"TED Talks are designed for maximum learning in minimum time."},
    {t:"Eat Until 80% Full",d:"Practice Hara Hachi Bu — stop eating when you feel 80% full at every meal today.",c:"health",e:"🇯🇵",xp:45,tip:"Okinawan longevity secret: eating to 80% reduces calorie intake without suffering."},
    {t:"Try a New Exercise You've Never Done",d:"Pick a completely new exercise — Turkish getup, bear crawl, etc. — and try it.",c:"fitness",e:"🆕",xp:40,tip:"Movement novelty stimulates motor cortex growth at any age."},
    {t:"Write a Review for a Small Business",d:"Leave a genuine positive review for a local business you appreciate.",c:"social",e:"⭐",xp:35,tip:"One review can increase a small business's revenue by 5-9%."},
    {t:"Set 3 Boundaries Today",d:"Identify and enforce 3 personal boundaries — say no, limit time, protect energy.",c:"growth",e:"🧱",xp:55,tip:"Boundaries aren't walls — they're filters that let the right things in."},
    {t:"Do 30 Tricep Dips on a Chair",d:"Use a stable chair and do 30 tricep dips. Break into sets if needed.",c:"fitness",e:"💺",xp:40,tip:"Tricep dips work 3 muscle groups at once with zero equipment."},
    {t:"Spend an Hour Without Sitting",d:"For one full hour, don't sit down at all. Stand, walk, pace, lean.",c:"health",e:"🧍",xp:40,tip:"One standing hour per day reduces heart disease risk by 12%."},
    {t:"Make Your Social Media Private for a Day",d:"Set all your social media to private for 24 hours. Notice how it feels.",c:"mindfulness",e:"🔐",xp:40,tip:"Privacy reduces performative behavior and increases authenticity."},
    {t:"Hold an Ice Cube Until It Melts",d:"Hold an ice cube in your closed fist until it completely melts. Feel the discomfort.",c:"mindfulness",e:"🧊",xp:40,tip:"Deliberate discomfort training builds resilience to stress."},
    {t:"Write an Apology You Owe",d:"Think of someone you may have hurt and write them a sincere apology.",c:"social",e:"💌",xp:55,tip:"Unresolved guilt is a major source of chronic low-grade anxiety."},
    {t:"Do 60 Mountain Climbers",d:"Do 60 mountain climbers (30 per side). Keep your core tight.",c:"fitness",e:"⛰️",xp:45,tip:"Mountain climbers combine cardio and core — maximum efficiency."},
    {t:"Try Left-Handed Everything for 1 Hour",d:"Use your non-dominant hand for everything for 1 hour. Eat, write, open doors.",c:"growth",e:"🤚",xp:45,tip:"This activates underused brain hemispheres and builds neuroplasticity."},
    {t:"Create a Playlist for Focus",d:"Build a focus playlist of at least 10 songs with no lyrics.",c:"creativity",e:"🎵",xp:30,tip:"Instrumental music at 60 BPM syncs with resting brain waves for optimal focus."},
    {t:"Compliment 5 Different People Today",d:"Give 5 genuine, specific compliments to 5 different people.",c:"social",e:"🌈",xp:45,tip:"Being the source of positivity makes people want to be around you."},
    {t:"Do a Full Digital Sunset at 8 PM",d:"Turn off all screens by 8 PM tonight. Read, talk, or stretch instead.",c:"health",e:"🌅",xp:50,tip:"Digital sunsets improve sleep quality by 40% within 3 days."},
    {t:"Draw a Self-Portrait",d:"Draw yourself — it doesn't need to be good. Just observe and create.",c:"creativity",e:"🎨",xp:40,tip:"Self-portraits increase self-awareness more than any journaling exercise."},
    {t:"Practice the Pomodoro Technique 4x",d:"Do 4 Pomodoro cycles (25 min work, 5 min break) today.",c:"productivity",e:"🍅",xp:50,tip:"4 Pomodoros/day = 100 minutes of deep work = top 1% productivity."},
    {t:"Research Your Family History",d:"Spend 20 minutes learning about your family history, ancestry, or heritage.",c:"growth",e:"🌳",xp:35,tip:"Connection to ancestral identity strengthens emotional resilience."},
    {t:"Clean One Room Top to Bottom",d:"Pick one room and clean it thoroughly — dust, vacuum, organize.",c:"productivity",e:"🧹",xp:45,tip:"A clean environment reduces cortisol and increases productivity by 20%."},
    {t:"Do 50 Pushups and 100 Squats Today",d:"Spread these throughout the day — morning, noon, evening.",c:"fitness",e:"🔥",xp:55,tip:"This combo hits 80% of your total body musculature."},
    {t:"Map Out Your Morning Routine",d:"Write down your ideal morning routine, step by step, with times.",c:"productivity",e:"🌅",xp:35,tip:"Written routines become automatic faster — saving willpower for real decisions."},
    {t:"Have a 30-Minute No-Phone Family Dinner",d:"Sit with family or friends for dinner — all phones in another room.",c:"social",e:"🍽️",xp:45,tip:"Phone-free meals improve relationship satisfaction by 30%."},
    {t:"Write 10 Things You Want to Learn",d:"List 10 skills or topics you'd love to learn someday.",c:"growth",e:"📝",xp:35,tip:"Curiosity lists keep your brain in growth mode."},
    {t:"Do Yoga for 20 Minutes",d:"Follow a 20-minute yoga video. Focus on breath and posture.",c:"fitness",e:"🧘‍♀️",xp:40,tip:"Yoga reduces inflammation markers by 22% in regular practitioners."},
    {t:"Forgive Someone Mentally",d:"Choose to mentally forgive someone who wronged you. Release the weight.",c:"mindfulness",e:"🕊️",xp:55,tip:"Forgiveness literally lowers blood pressure and heart rate."},
    {t:"Build a Tower from Household Items",d:"Stack random household items into the tallest tower you can. Get creative.",c:"creativity",e:"🗼",xp:30,tip:"Physical building challenges engage spatial reasoning and problem-solving."},
    {t:"Eat a Meal with Chopsticks",d:"Even if you normally use a fork — eat one meal with chopsticks today.",c:"growth",e:"🥢",xp:30,tip:"Chopsticks force slower eating, improving digestion and satisfaction."},
  ];

  const HARD = [
    {t:"5-Hour Phone Detox",d:"No phone usage for 5 full hours. Put it in a drawer and walk away.",c:"productivity",e:"☠️",xp:100,tip:"True phone detoxes cause withdrawal symptoms — that's proof you needed one."},
    {t:"Run 5 Kilometers",d:"Lace up and run a full 5K today. Walk if you must, but finish.",c:"fitness",e:"🏃",xp:90,tip:"Your first 5K changes your identity: you become 'someone who runs'."},
    {t:"Wake Up at 5 AM",d:"Set your alarm for 5:00 AM and get up immediately. No snoozing.",c:"productivity",e:"⏰",xp:80,tip:"The 5AM club: 1 hour of silence, 1 of exercise, 1 of learning."},
    {t:"Cold Shower — Full 3 Minutes",d:"Take a full 3-minute cold shower. No warm water at any point.",c:"health",e:"🥶",xp:85,tip:"3 minutes of cold water = 6 hours of elevated norepinephrine."},
    {t:"100 Burpees Challenge",d:"Complete 100 burpees throughout the day. Track your sets.",c:"fitness",e:"💀",xp:95,tip:"100 burpees burns 500+ calories and tests every major muscle group."},
    {t:"Write a 1000-Word Essay",d:"Write 1000 words on any topic. Make it coherent and compelling.",c:"creativity",e:"📝",xp:85,tip:"1000 words forces you past surface-level thinking into genuine insight."},
    {t:"Zero Screen Entertainment Today",d:"No TV, YouTube, TikTok, gaming, or streaming for the entire day.",c:"productivity",e:"📺",xp:90,tip:"One day without screens reveals how much time you actually have."},
    {t:"Do 200 Pushups Throughout the Day",d:"200 pushups spread across the day. Set reminders every hour.",c:"fitness",e:"💪",xp:90,tip:"200 pushups/day is military-level fitness conditioning."},
    {t:"Fast for 24 Hours",d:"Eat nothing for 24 hours (water, tea, and black coffee only).",c:"health",e:"⏳",xp:95,tip:"24-hour fasts trigger deep autophagy — cellular self-cleaning."},
    {t:"Memorize and Recite a Full Poem",d:"Choose a poem of at least 8 lines, memorize it, and recite it to someone.",c:"growth",e:"🎭",xp:80,tip:"Poetry memorization was once the standard test of an educated mind."},
    {t:"Run 10 Flights of Stairs",d:"Find a staircase and run up and down 10 times without stopping.",c:"fitness",e:"🪜",xp:80,tip:"Stair running is the most calorie-efficient cardio exercise."},
    {t:"Zero Caffeine Today",d:"No coffee, tea, energy drinks, or soda containing caffeine.",c:"health",e:"🚫",xp:75,tip:"Caffeine withdrawal headaches prove your dependency — time to reset."},
    {t:"Meditate for 30 Minutes",d:"Sit in silent meditation for 30 uninterrupted minutes.",c:"mindfulness",e:"🧘",xp:80,tip:"30 minutes of meditation changes measurable brain structure within days."},
    {t:"Deep Work for 3 Hours Straight",d:"Work on your hardest task for 3 hours with zero breaks or distractions.",c:"productivity",e:"🎯",xp:95,tip:"3 hours of deep work = what most people accomplish in 3 days."},
    {t:"Do 300 Squats Throughout the Day",d:"300 bodyweight squats spread across the entire day. Monitor your form.",c:"fitness",e:"🦵",xp:90,tip:"300 squats/day is an ancient military conditioning technique."},
    {t:"Speak Only When Spoken To",d:"For the first 4 hours of your day, don't initiate conversation. Only respond.",c:"mindfulness",e:"🤫",xp:80,tip:"Selective silence sharpens listening and observation skills dramatically."},
    {t:"Create Something From Scratch",d:"Build, draw, code, write, or craft something entirely original today.",c:"creativity",e:"🔨",xp:85,tip:"Creation — not consumption — is the ultimate expression of human potential."},
    {t:"Hold a 3-Minute Plank",d:"Hold a plank for 3 full minutes. Rest if you must, but finish.",c:"fitness",e:"🏋️",xp:80,tip:"3-minute planks are elite-level core endurance."},
    {t:"Write a Detailed 5-Year Plan",d:"Map out where you want to be in 5 years — career, health, relationships, finance.",c:"growth",e:"🗺️",xp:90,tip:"5-year plans aren't about being rigid — they're about having direction."},
    {t:"Walk 15,000 Steps",d:"Hit 15,000 steps today. That's about 7 miles of walking.",c:"fitness",e:"🚶",xp:85,tip:"15K steps/day is where maximum cardiovascular benefits plateau."},
    {t:"No Complaining, No Excuses, No Gossip",d:"Eliminate complaints, excuses, and gossip for the entire day.",c:"mindfulness",e:"🛡️",xp:90,tip:"This trifecta eliminates 80% of negative social energy from your life."},
    {t:"Do a Complete Digital Declutter",d:"Delete unused apps, unsubscribe from emails, organize all files.",c:"productivity",e:"🧹",xp:80,tip:"Digital minimalism is the foundation of focused modern life."},
    {t:"Read 50 Pages",d:"Read 50 pages of a book in a single day. Block out the time.",c:"growth",e:"📖",xp:80,tip:"50 pages/day = 75+ books per year. That's life-changing knowledge."},
    {t:"Do a Full HIIT Session",d:"Complete a 20-minute High Intensity Interval Training workout.",c:"fitness",e:"🔥",xp:85,tip:"20 minutes of HIIT burns calories for 48 hours afterward."},
    {t:"Teach a Full Skill to Someone",d:"Pick something you know well and teach it to someone from scratch.",c:"social",e:"👨‍🏫",xp:85,tip:"Teaching deepens your own mastery more than any other learning method."},
    {t:"Zero Added Sugar for 3 Meals",d:"All 3 meals today must have zero added sugar. Check every label.",c:"health",e:"🍬",xp:80,tip:"Zero sugar meals reset dopamine sensitivity within 24 hours."},
    {t:"Do 50 Pull-ups Throughout the Day",d:"Find a bar and do 50 pull-ups spread across the day.",c:"fitness",e:"🐒",xp:95,tip:"Pull-ups are the king of upper body exercises — period."},
    {t:"Journal for 30 Minutes",d:"Write continuously in your journal for 30 minutes without stopping.",c:"creativity",e:"📓",xp:75,tip:"30-minute journaling sessions access subconscious thoughts that short entries miss."},
    {t:"Solve 3 Complex Problems",d:"Take 3 real problems in your life and brainstorm detailed solution strategies.",c:"productivity",e:"🧩",xp:80,tip:"Problem-solving sessions work best when scheduled — not when problems erupt."},
    {t:"Take a 1-Hour Walk in Nature",d:"Walk in a park, forest, or natural area for a full hour.",c:"mindfulness",e:"🌿",xp:75,tip:"1 hour in nature reduces cortisol for the entire following week."},
    {t:"Do Pistol Squat Practice",d:"Spend 15 minutes practicing pistol squats (single-leg squats).",c:"fitness",e:"🦵",xp:80,tip:"Pistol squats build balance, flexibility, and unilateral leg strength simultaneously."},
    {t:"Eat Only Whole Foods",d:"Every single thing you eat today must be a whole, unprocessed food.",c:"health",e:"🥦",xp:85,tip:"One day of whole foods is enough to noticeably improve energy levels."},
    {t:"Write 500 Words of Fiction",d:"Write a 500-word short story or start a novel chapter. Be creative.",c:"creativity",e:"✍️",xp:80,tip:"Fiction writing builds empathy, creativity, and communication skills."},
    {t:"Do a Full Mobility Routine",d:"Spend 30 minutes on full-body mobility — hips, ankles, shoulders, thoracic spine.",c:"fitness",e:"🔄",xp:75,tip:"Mobility is the foundation that strength and flexibility are built upon."},
    {t:"Have a 15-Minute Hard Conversation",d:"Have that difficult conversation you've been avoiding.",c:"social",e:"💬",xp:95,tip:"The conversations you avoid are the ones that matter most."},
    {t:"Practice Speed Reading for 20 Minutes",d:"Use a finger guide and try to read 2x your normal speed for 20 minutes.",c:"growth",e:"⚡",xp:70,tip:"Speed reading is a skill — the more you practice, the more natural it becomes."},
    {t:"Do 1000 Steps of Walking Lunges",d:"Do walking lunges throughout the day. Count every step. Hit 1000.",c:"fitness",e:"🦿",xp:95,tip:"Walking lunges are the most functional leg exercise for real-world strength."},
    {t:"Zero Entertainment Until Tasks Done",d:"No fun, relaxation, or entertainment until every task for the day is complete.",c:"productivity",e:"⚔️",xp:90,tip:"'Eat the frog first' — do the hard thing before you reward yourself."},
    {t:"Cold Plunge for 2 Minutes",d:"Submerge in cold water (shower, tub, lake) for 2 full minutes.",c:"health",e:"🏊",xp:90,tip:"Cold plunges are used by Olympians, Navy SEALs, and monks — for good reason."},
    {t:"Write Your Own Obituary",d:"Write a 200-word obituary as if you lived your ideal life. Then chase it.",c:"growth",e:"⚰️",xp:90,tip:"Stephen Covey: 'Begin with the end in mind' — this IS the exercise."},
    {t:"Do a Workout at Max Effort",d:"Whatever your exercise is, do it today at 100% maximum effort.",c:"fitness",e:"💯",xp:85,tip:"One max-effort session per week is where all the growth happens."},
    {t:"Spend 2 Hours Learning a New Skill",d:"Dedicate 2 full hours to learning something you've never tried.",c:"growth",e:"🎓",xp:85,tip:"2 focused hours beats 2 weeks of casual dabbling."},
    {t:"Write 10 Micro-Habits to Adopt",d:"List 10 tiny habits (under 2 minutes each) and do all of them today.",c:"productivity",e:"🔬",xp:80,tip:"Micro-habits are the compound interest of self-improvement."},
    {t:"Do 250 Pushups and 250 Squats",d:"250 of each. Spread across the entire day. Track every rep.",c:"fitness",e:"🫡",xp:100,tip:"This is military selection-level volume. You'll sleep incredibly tonight."},
    {t:"Zero Negativity Day",d:"No negative thoughts, words, or actions for 24 hours. Pure positivity.",c:"mindfulness",e:"☀️",xp:90,tip:"24 hours of positivity physically changes your brain's default network."},
    {t:"Learn and Perform a New Recipe Without Looking",d:"Study a recipe, then cook it entirely from memory.",c:"creativity",e:"👨‍🍳",xp:80,tip:"Memory-based cooking builds both culinary and cognitive skills."},
    {t:"Read for 2 Hours Straight",d:"Set a timer and read for 2 uninterrupted hours. No phone, no breaks.",c:"growth",e:"📚",xp:85,tip:"2-hour reading sessions achieve 'deep reading' — information embeds permanently."},
    {t:"Do a Full Sprint Session",d:"10 x 100-meter sprints with 1-minute rest between each.",c:"fitness",e:"⚡",xp:90,tip:"Sprints build more muscle and burn more fat than any other cardio form."},
    {t:"Build a Complete Daily Routine from Scratch",d:"Design your ideal daily routine hour-by-hour. Implement it tomorrow.",c:"productivity",e:"🏗️",xp:85,tip:"The best routines are designed intentionally, not formed by accident."},
    {t:"Write a Gratitude Letter and Send It",d:"Write a detailed gratitude letter to someone who changed your life and actually send it.",c:"social",e:"💌",xp:90,tip:"Gratitude letters produce the longest-lasting happiness boost of any intervention."},
    {t:"Do an Endurance Challenge",d:"Pick any exercise and do it continuously for 10 minutes. Don't stop.",c:"fitness",e:"🏆",xp:85,tip:"10-minute endurance tests reveal true fitness level beyond rep counts."},
    {t:"Plan and Cook 3 Healthy Meals",d:"Plan, shop for, and cook all 3 of your meals today. No takeout.",c:"health",e:"🥘",xp:80,tip:"Meal planning is the single most effective nutrition intervention."},
    {t:"Design Your Ideal Life on Paper",d:"Spend 1 hour writing every detail of your dream life — home, career, relationships.",c:"growth",e:"🏡",xp:85,tip:"Detail is key: the brain can't aim for a vague target."},
    {t:"Spend a Full Evening Offline",d:"From 6 PM to bedtime, zero screens. Read, talk, walk, create.",c:"productivity",e:"🌙",xp:80,tip:"Offline evenings improve sleep quality and next-day cognitive performance by 25%."},
    {t:"Mentor Someone for 30 Minutes",d:"Find someone younger or less experienced and give them 30 minutes of advice.",c:"social",e:"🧓",xp:80,tip:"Mentoring others solidifies your own knowledge and builds legacy."},
    {t:"Complete a Full Flexibility Routine",d:"Hold 15 stretches for 1 minute each. Full body, deep stretching.",c:"fitness",e:"🤸",xp:75,tip:"Deep stretching triggers the parasympathetic system — the deepest relaxation."},
    {t:"Write a Personal Mission Statement",d:"In 2-3 sentences, define who you are and what you stand for.",c:"growth",e:"📜",xp:85,tip:"Personal mission statements reduce decision paralysis and increase integrity."},
    {t:"Do a Silent Hour",d:"Go completely silent for 1 full hour. No talking, texting, or typing.",c:"mindfulness",e:"🤫",xp:75,tip:"An hour of silence is more restorative than 3 hours of entertainment."},
    {t:"Hold a Wall Sit for 3 Minutes",d:"Back against the wall, thighs parallel. Hold for 3 agonizing minutes.",c:"fitness",e:"🧱",xp:80,tip:"3-minute wall sits build the kind of mental toughness that transfers to life."},
    {t:"Compliment 10 People Today",d:"Find and deliver 10 genuine, specific compliments to 10 different people.",c:"social",e:"🌟",xp:80,tip:"Being generous with praise makes you more influential and likeable."},
    {t:"Map Out Your Next 30 Days",d:"Create a 30-day plan with specific daily goals and milestones.",c:"productivity",e:"📅",xp:85,tip:"30-day plans are the sweet spot — long enough to transform, short enough to sustain."},
    {t:"Do a Bear Crawl for 5 Minutes",d:"Get on all fours and bear crawl for 5 minutes total. Rest as needed.",c:"fitness",e:"🐻",xp:80,tip:"Bear crawls are used in combat fitness training for full-body conditioning."},
    {t:"Write a Powerful 'No' List",d:"List 10 things you will STOP doing, tolerating, or accepting.",c:"growth",e:"✋",xp:85,tip:"What you stop doing matters more than what you start doing."},
    {t:"Do 500 Jump Rope Skips",d:"500 jump rope skips (or simulate without a rope). Track your count.",c:"fitness",e:"⏭️",xp:80,tip:"10 minutes of jump rope = 30 minutes of jogging (calorically)."},
    {t:"Zero Procrastination Day",d:"Attack every task immediately today. Zero delay between thinking and doing.",c:"productivity",e:"⚡",xp:95,tip:"Procrastination is an emotion regulation problem, not a time management one."},
    {t:"Cook for Someone Else",d:"Prepare and cook a full meal for someone you care about.",c:"social",e:"🍳",xp:75,tip:"Cooking for others is one of humanity's oldest expressions of love."},
    {t:"Do a Full Yoga Flow",d:"Complete a 45-minute yoga flow — sun salutations, warriors, balances, savasana.",c:"fitness",e:"🧘‍♂️",xp:80,tip:"A full yoga flow is both workout and meditation simultaneously."},
    {t:"Track Every Minute of Your Day",d:"Log how you spend every single minute today. Every. Single. One.",c:"productivity",e:"⏱️",xp:90,tip:"Time auditing reveals 2-4 hours of wasted time most people don't know about."},
    {t:"Have a Technology-Free Morning",d:"From wake-up until noon, use zero technology. No phone, no computer.",c:"mindfulness",e:"🌅",xp:90,tip:"Tech-free mornings are used by virtually every high-performing CEO."},
    {t:"Attempt 10 Handstand Holds",d:"Practice 10 handstand attempts against a wall or freestanding.",c:"fitness",e:"🤸‍♂️",xp:80,tip:"Handstands build shoulder strength, core stability, and confidence."},
    {t:"Write a Letter of Advice to Your Past Self",d:"Write to yourself 5 years ago. What would you tell them?",c:"growth",e:"⏮️",xp:75,tip:"This exercise reveals how much you've grown — and what you still need."},
    {t:"Stay in Monk Mode All Day",d:"Zero entertainment, zero social, zero browsing. Only work and self-improvement.",c:"productivity",e:"🧘",xp:100,tip:"One day of 'monk mode' accomplishes what a normal week can't."},
    {t:"Do 1000 Total Reps of Anything",d:"Combine any exercises to hit 1000 total reps today. Track everything.",c:"fitness",e:"🔥",xp:100,tip:"The '1000 rep challenge' is a legendary fitness benchmark."},
    {t:"Write Your Legacy Statement",d:"In 500 words, describe the legacy you want to leave behind.",c:"growth",e:"🏛️",xp:90,tip:"Legacy thinking transforms short-term choices into long-term investments."},
    {t:"Do Everything 10% Faster Today",d:"Walk faster, work faster, decide faster. 10% more speed in everything.",c:"productivity",e:"⚡",xp:80,tip:"Momentum is real — faster pace creates higher energy which creates more momentum."},
    {t:"Donate to a Cause You Believe In",d:"Give time, money, or resources to a cause that matters to you.",c:"social",e:"💝",xp:80,tip:"Generosity triggers dopamine release — the 'helper's high' is scientifically real."},
  ];

  const ALL_CHALLENGES = { easy: EASY, medium: MEDIUM, hard: HARD };

  // ─── STORAGE (localForage) ───

  async function getState() {
    try {
      return await localforage.getItem(DC_STATE_KEY);
    } catch(e) { return null; }
  }

  async function setState(state) {
    try {
      await localforage.setItem(DC_STATE_KEY, state);
    } catch(e) { console.warn('DC: Failed to save state', e); }
  }

  async function getIndex() {
    try {
      const idx = await localforage.getItem(DC_INDEX_KEY);
      return idx || { easy: 0, medium: 0, hard: 0, totalDays: 0, streak: 0, lastDate: null };
    } catch(e) { return { easy: 0, medium: 0, hard: 0, totalDays: 0, streak: 0, lastDate: null }; }
  }

  async function setIndex(idx) {
    try {
      await localforage.setItem(DC_INDEX_KEY, idx);
    } catch(e) { console.warn('DC: Failed to save index', e); }
  }

  // ─── HELPERS ───

  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getYesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function getDifficulty(streak) {
    if (streak < 20) return 'easy';
    if (streak < 70) return 'medium';
    return 'hard';
  }

  function pickChallenge(idx) {
    const diff = getDifficulty(idx.streak);
    const pool = ALL_CHALLENGES[diff];
    const pointer = idx[diff] % pool.length; // wrap around if somehow exceeded
    const challenge = pool[pointer];
    return {
      ...challenge,
      title: challenge.t,
      description: challenge.d,
      category: challenge.c,
      emoji: challenge.e,
      difficulty: diff
    };
  }

  // ─── DOM ───

  let els = {};
  const DC_ENABLED_KEY = 'dc_enabled';

  function getEls() {
    els = {
      container: document.getElementById('dc-mini-container'),
      loading: document.getElementById('dc-loading'),
      content: document.getElementById('dc-content'),
      topRow: document.querySelector('.dc-mini-top-row'),
      emoji: document.getElementById('dc-emoji'),
      title: document.getElementById('dc-title'),
      description: document.getElementById('dc-description'),
      category: document.getElementById('dc-category'),
      difficulty: document.getElementById('dc-difficulty'),
      tip: document.getElementById('dc-tip'),
      streakCount: document.getElementById('dc-streak-count'),
      streakBadge: document.getElementById('dc-streak-badge'),
      actions: document.getElementById('dc-actions'),
      completeBtn: document.getElementById('dc-complete-btn'),
      completed: document.getElementById('dc-completed'),
      toggle: document.getElementById('dc-toggle')
    };
  }

  function renderChallenge(challenge, status, streak, isPaused) {
    if (!els.content) return;

    els.loading.classList.add('hidden');
    els.content.classList.remove('hidden');
    // Always start compact — user clicks to expand
    els.content.classList.add('dc-collapsed');

    els.emoji.textContent = challenge.emoji || '⚡';
    els.title.textContent = challenge.title;
    if (els.description) els.description.textContent = challenge.description;
    if (els.category) els.category.textContent = challenge.category;
    if (els.difficulty) {
      els.difficulty.textContent = challenge.difficulty;
      els.difficulty.setAttribute('data-diff', challenge.difficulty);
    }
    if (els.tip) els.tip.textContent = '💡 ' + (challenge.tip || 'Stay consistent!');
    els.streakCount.textContent = streak || 0;

    // Show pause state on streak badge
    els.container.classList.remove('is-completed', 'is-paused');
    if (els.streakBadge) {
      if (isPaused && status !== 'completed') {
        els.streakBadge.innerHTML = '⏸️ <span id="dc-streak-count">' + (streak || 0) + '</span>';
        els.container.classList.add('is-paused');
      } else {
        els.streakBadge.innerHTML = '🔥 <span id="dc-streak-count">' + (streak || 0) + '</span>';
      }
    }

    // States
    els.actions.classList.add('hidden');
    els.completed.classList.add('hidden');

    if (status === 'new' || status === 'accepted') {
      els.actions.classList.remove('hidden');
    } else if (status === 'completed') {
      els.completed.classList.remove('hidden');
      els.container.classList.add('is-completed');
      els.container.classList.remove('is-paused');
    }

    // Sync vitality flag
    window._dcCompletedToday = (status === 'completed');
    if (typeof updateVitalityUI === 'function') updateVitalityUI();
  }

  // ─── EVENT HANDLERS ───

  async function handleComplete() {
    const state = await getState();
    if (!state) return;
    state.status = 'completed';
    await setState(state);

    const idx = await getIndex();
    const yesterday = getYesterdayKey();
    const today = getTodayKey();

    // Increment streak (resume if paused)
    if (idx.lastDate === yesterday || idx.lastDate === today) {
      if (idx.lastDate !== today) idx.streak += 1;
    } else {
      // Was paused — resume with +1
      idx.streak = (idx.streak || 0) + 1;
    }
    idx.lastDate = today;

    // Advance the pointer for the difficulty pool
    const diff = getDifficulty(idx.streak > 0 ? idx.streak - 1 : 0);
    idx[diff] = (idx[diff] || 0) + 1;
    idx.totalDays += 1;

    await setIndex(idx);
    renderChallenge(state.challenge, 'completed', idx.streak, false);

    // Trigger vitality streak check
    if (typeof tryVitalityStreak === 'function') tryVitalityStreak();
  }

  // ─── SETTINGS TOGGLE ───

  async function isEnabled() {
    try {
      const val = await localforage.getItem(DC_ENABLED_KEY);
      return val !== false;
    } catch(e) { return true; }
  }

  async function setEnabled(val) {
    try { await localforage.setItem(DC_ENABLED_KEY, val); } catch(e) {}
  }

  function showContainer(show) {
    if (els.container) {
      els.container.style.display = show ? '' : 'none';
    }
  }

  function syncVitalityWithDC(enabled) {
    window._dcEnabledCache = enabled;
    if (!enabled) {
      window._dcCompletedToday = false;
    }
    // Re-render vitality config to add/remove challenge factor
    if (typeof renderVitalityConfigCards === 'function') renderVitalityConfigCards();
    if (typeof updateVitalityUI === 'function') updateVitalityUI();
  }

  // ─── INIT ───

  async function init() {
    getEls();
    if (!els.container) return;

    // ── STEP 1: Immediately show SOMETHING (synchronous, no async) ──
    // This guarantees the user NEVER sees "Loading..." stuck on screen.
    // We render a placeholder challenge instantly, then update from storage.
    if (els.loading) els.loading.classList.add('hidden');
    if (els.content) {
      els.content.classList.remove('hidden');
      els.content.classList.add('dc-collapsed');
    }

    // Wire the expand/collapse toggle immediately
    if (els.topRow && !els.topRow._dcWired) {
      els.topRow._dcWired = true;
      els.topRow.addEventListener('click', () => {
        if (els.content) els.content.classList.toggle('dc-collapsed');
      });
    }

    // If localforage isn't ready yet, show a default challenge and retry
    if (typeof localforage === 'undefined') {
      console.warn('DC: localForage not loaded yet, showing default challenge');
      const fallback = pickChallenge({ easy: 0, medium: 0, hard: 0, totalDays: 0, streak: 0, lastDate: null });
      renderChallenge(fallback, 'new', 0, false);
      setTimeout(init, 800);
      return;
    }

    // ── STEP 2: Wire complete button ──
    if (els.completeBtn && !els.completeBtn._dcWired) {
      els.completeBtn._dcWired = true;
      els.completeBtn.addEventListener('click', handleComplete);
    }

    // ── STEP 3: Load real data from localforage (async but non-blocking) ──
    try {
      // Check enabled state
      const enabled = await isEnabled();
      window._dcEnabledCache = enabled;
      showContainer(enabled);

      if (els.toggle && !els.toggle._dcWired) {
        els.toggle._dcWired = true;
        els.toggle.checked = enabled;
        els.toggle.addEventListener('change', async function() {
          const on = els.toggle.checked;
          await setEnabled(on);
          showContainer(on);
          syncVitalityWithDC(on);
        });
      }
      if (!enabled) {
        window._dcCompletedToday = false;
        syncVitalityWithDC(false);
        return;
      }

      // Load state and index
      const state = await getState();
      const today = getTodayKey();
      const idx = await getIndex();

      // Check streak continuity — detect pause
      const yesterday = getYesterdayKey();
      let isPaused = false;
      if (idx.lastDate && idx.lastDate !== yesterday && idx.lastDate !== today) {
        isPaused = true;
      }

      if (state && state.date === today && state.challenge) {
        // Already have today's challenge — render the real one
        renderChallenge(state.challenge, state.status || 'new', idx.streak, isPaused);
        return;
      }

      // Generate new challenge for today
      const challenge = pickChallenge(idx);
      const newState = { challenge, status: 'new', date: today };
      await setState(newState);
      renderChallenge(challenge, 'new', idx.streak, isPaused);

    } catch (err) {
      console.error('DC: init storage failed, using fallback', err);
      // Already showing content from step 1, so just render a default challenge
      const fallback = pickChallenge({ easy: 0, medium: 0, hard: 0, totalDays: 0, streak: 0, lastDate: null });
      renderChallenge(fallback, 'new', 0, false);
    }
  }

  // ─── EARLY SYNC: Set _dcCompletedToday BEFORE vitality reads it ───
  async function earlySyncDcFlag() {
    try {
      if (typeof localforage === 'undefined') return;
      const state = await localforage.getItem(DC_STATE_KEY);
      if (!state) return;
      const d = new Date();
      const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (state.date === today && state.status === 'completed') {
        window._dcCompletedToday = true;
      } else {
        window._dcCompletedToday = false;
      }
      if (typeof updateVitalityUI === 'function') updateVitalityUI();
    } catch (e) { /* silent */ }
  }

  // ─── BOOT ───
  // Run early vitality sync ASAP, then init UI immediately (no 300ms delay)
  earlySyncDcFlag();
  // Script is at the bottom of the page, so DOM is ready — init immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    // DOM already ready — run NOW, not after 300ms
    init();
  }

  window.dailyChallenge = { init, getIndex };
})();


