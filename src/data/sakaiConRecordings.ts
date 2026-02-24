export type ConferenceRecording = {
  title: string;
  date: string;
  href: string;
};

export type ConferenceYear = {
  id: string;
  heading: string;
  summary: string;
  playlistHref: string;
  recordings: ConferenceRecording[];
};

export const sakaiVirtualConferences: ConferenceYear[] = [
  {
    id: "2025",
    heading: "Sakai Virtual Conference 2025",
    summary: "Nine session recordings from July 2025.",
    playlistHref: "https://www.youtube.com/playlist?list=PLlwxoUJvHUhUfDQAiT4ewqqMIuXrAbHYp",
    recordings: [
      {
        title: "SVC25 Welcome",
        date: "2025-07-22T16:02:03+00:00",
        href: "https://www.youtube.com/watch?v=owAwETTn5AM"
      },
      {
        title: "SVC25 My 5 Favorite New Things in Sakai 25",
        date: "2025-07-22T16:06:29+00:00",
        href: "https://www.youtube.com/watch?v=ROBb3aC9b98"
      },
      {
        title: "SVC25 Lightning Talks",
        date: "2025-07-22T16:05:16+00:00",
        href: "https://www.youtube.com/watch?v=JRdiBjfLeZ0"
      },
      {
        title: "SVC25 Optimizing Course Design and Lesson Planning: Leveraging Sakai Templates",
        date: "2025-07-22T16:11:31+00:00",
        href: "https://www.youtube.com/watch?v=yFu2NjsFNpg"
      },
      {
        title: "SVC25 Let's Break Something New",
        date: "2025-07-22T16:13:58+00:00",
        href: "https://www.youtube.com/watch?v=qPxlNSYnsjk"
      },
      {
        title: "SVC25 There and Back Again: A Reflective Quest for a Faculty Development Model",
        date: "2025-07-22T16:16:10+00:00",
        href: "https://www.youtube.com/watch?v=rdxQwZAIet4"
      },
      {
        title: "SVC25 Search Tool in Sakai",
        date: "2025-07-22T16:17:17+00:00",
        href: "https://www.youtube.com/watch?v=sBSMudczA60"
      },
      {
        title: "SVC25 AI Features in Sakai - Birds of a Feather Interactive Session",
        date: "2025-07-22T16:18:51+00:00",
        href: "https://www.youtube.com/watch?v=suCZWA2p6dw"
      },
      {
        title: "SVC25 Wrap-up and Prizes",
        date: "2025-07-22T16:20:44+00:00",
        href: "https://www.youtube.com/watch?v=t9JuajIdeqg"
      }
    ]
  },
  {
    id: "2024",
    heading: "Sakai Virtual Conference 2024",
    summary: "Ten session recordings from November 2024.",
    playlistHref: "https://www.youtube.com/playlist?list=PLlwxoUJvHUhXcusTVfWviOkAwOAH4flBw",
    recordings: [
      {
        title: "SVC24 Welcome",
        date: "2024-11-22T19:21:23+00:00",
        href: "https://www.youtube.com/watch?v=PYmHK9fToTs"
      },
      {
        title: "SVC24 What's New in Sakai 25?",
        date: "2024-11-22T18:58:14+00:00",
        href: "https://www.youtube.com/watch?v=SIO2KbZ6gAU"
      },
      {
        title: "SVC24 Sakai, the Progressive Web App",
        date: "2024-11-22T19:23:09+00:00",
        href: "https://www.youtube.com/watch?v=FNCU2xQHqPo"
      },
      {
        title: "SVC24 Big Changes in LTI",
        date: "2024-11-22T18:56:39+00:00",
        href: "https://www.youtube.com/watch?v=ICuce9EcWJw"
      },
      {
        title: "SVC24 Voluntarily Excellent When It Comes To Accessibility: A Reviewer-Friendly VPAT",
        date: "2024-11-22T18:52:05+00:00",
        href: "https://www.youtube.com/watch?v=W1cn03DKP6I"
      },
      {
        title: "SVC24 Xerte and Sakai",
        date: "2024-11-22T19:24:34+00:00",
        href: "https://www.youtube.com/watch?v=Y9upL2kshxg"
      },
      {
        title: "SVC24 Empowering New Adjunct Faculty: A Guide for Sakai Onboarding",
        date: "2024-11-22T19:26:37+00:00",
        href: "https://www.youtube.com/watch?v=s3N283qnETo"
      },
      {
        title: "SVC24 Lets Talk Templates",
        date: "2024-11-22T19:28:54+00:00",
        href: "https://www.youtube.com/watch?v=9l-B-jGu6nw"
      },
      {
        title: "SVC24 Sakai Developer School",
        date: "2024-11-22T18:59:46+00:00",
        href: "https://www.youtube.com/watch?v=dU4H0tsZyyY"
      },
      {
        title: "SVC24 Wrap-up and Prizes",
        date: "2024-11-22T18:54:17+00:00",
        href: "https://www.youtube.com/watch?v=AVzPPlLid1U"
      }
    ]
  }
];
