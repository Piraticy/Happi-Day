const STORIES = [
  {
    title: 'The office plant', teaser: 'A promotion nobody saw coming',
    setup: 'I started saying good morning to the plant on my desk. A week later it had a new leaf, so my colleague asked for my secret. I told her it was positive feedback. Soon the whole office was greeting the plant. By Friday, someone had made it a tiny employee badge and invited it to the team meeting.',
    ending: 'The plant stayed quiet, which made it the best listener in the room.',
  },
  {
    title: 'A very busy cat', teaser: 'She finished her to-do list first',
    setup: 'I wrote a to-do list while my cat watched from the sofa. Before I could start, she climbed onto the paper and sat down. I moved the list; she moved with it. After three attempts I gave up and made her a list of her own: nap, inspect window, nap again. She curled up on the first line.',
    ending: 'By lunchtime she had completed more of her list than I had of mine.',
  },
  {
    title: 'Elevator neighbors', teaser: 'The longest trip to floor six',
    setup: 'The elevator stopped at every floor. On floor two, a person carrying a cake joined us. On floor three, somebody asked whose birthday it was. Nobody knew, including the person with the cake; they were delivering it. By floor five, we had planned a party for a stranger and agreed that the elevator music was terrible.',
    ending: 'When the doors opened on six, we applauded the cake for making it.',
  },
  {
    title: 'The brilliant notebook', teaser: 'A perfect place for one idea',
    setup: 'I bought a beautiful notebook for brilliant ideas. The cover was so nice that I spent ten minutes choosing a pen worthy of page one. Then I waited for a suitably brilliant thought. The only thought I had was that I should remember where I put the notebook, so I wrote that down and felt oddly accomplished.',
    ending: 'The next day I lost the notebook, but at least it knew what the problem was.',
  },
  {
    title: 'Pigeon on a mission', teaser: 'Three meetings, zero minutes to spare',
    setup: 'A pigeon crossed the square with the brisk walk of someone late for three meetings. It dodged a bicycle, inspected a crumb, and hurried past a whole group of pigeons without stopping. I followed it with my eyes all the way to a bench, where it finally paused beside a paper bag.',
    ending: 'Its urgent appointment was lunch. Honestly, I respect the priorities.',
  },
  {
    title: 'The accidental wave', teaser: 'A five-second friendship',
    setup: 'I waved at someone across the street. They waved back with great enthusiasm, which was lovely until I realized they were greeting the person behind me. There was a second in which we could both pretend nothing had happened. Instead, we kept waving as if we were old friends separated by traffic.',
    ending: 'The light changed, we walked on, and I still think we handled it beautifully.',
  },
  {
    title: 'The adventurous umbrella', teaser: 'It had other plans for the weather',
    setup: 'A gust of wind turned my umbrella inside out at the exact moment I was trying to look like a person who understands weather. I stopped under a shop awning and fought the spokes back into place. A child nearby announced that my umbrella was trying to become a satellite dish. I could not argue with the evidence.',
    ending: 'For the rest of the walk, I let it receive the forecast.',
  },
  {
    title: 'Kettle negotiations', teaser: 'A surprisingly quick agreement',
    setup: 'I asked the kettle to hurry because I was late. It clicked off immediately, and I thanked it out loud. My roommate walked in just in time to hear the end of our conversation. I explained that we had a very efficient working relationship. She poured herself tea and asked the toaster if it could do the same.',
    ending: 'The toaster offered no comment, but it did burn one side in protest.',
  },
  {
    title: 'The traveling sock', teaser: 'A mystery in the laundry basket',
    setup: 'One sock vanished in the wash. I checked the machine, the floor, and every sleeve of every shirt. For two days its partner waited on the dresser, looking like a tiny abandoned flag. Then I changed the pillowcases and found the missing sock tucked inside one, perfectly dry and apparently very comfortable.',
    ending: 'I reunited the pair. Neither would explain the holiday.',
  },
  {
    title: 'A stick too ambitious', teaser: 'One dog, one enormous project',
    setup: 'A dog in the park found a stick nearly twice its own length. It tried the narrow path, turned sideways, tried again, and stopped to consider the problem. Its person offered a smaller stick. The dog politely ignored this inferior proposal, backed up three steps, and carried the big one through the open grass instead.',
    ending: 'It reached the gate looking like an engineer who had just solved a bridge.',
  },
  {
    title: 'The very short walk', teaser: 'My phone counted every step',
    setup: 'My phone suggested a walk after I had walked from my desk to the fridge. I was ready to be offended, but then I realized the fridge was empty and the shop was only a few streets away. I went out, found a snack, and came home by a different route just to make the trip feel official.',
    ending: 'The phone congratulated me. We both agreed not to discuss what started it.',
  },
  {
    title: 'Pancake geography', teaser: 'Breakfast became an expedition',
    setup: 'My pancake landed in the pan looking nothing like a circle. One edge stretched into a peninsula and another curled up like a mountain range. I almost made a new one, but my friend said it looked like a country we could visit. We added blueberry lakes and a little river of syrup, then planned a holiday there.',
    ending: 'The trip was delicious, though the map did not survive breakfast.',
  },
] as const

export function storyForDay(now: Date) {
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000)
  return STORIES[day % STORIES.length]
}
