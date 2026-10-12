/* Edit your wedding details here, then reload the page.
 * Leave any unknown value as "". The site will show a gentle coming-soon message.
 * URLs can be https:// links (RSVP form, registry, maps, hotel booking, etc.).
 */
window.WEDDING = {
  names: { first: "David", second: "Gypsy" },
  date: "", // For example: "Saturday, 18 September 2027"
  location: "", // For example: "Hudson Valley, New York"
  venue: "",
  video: {
    src: "assets/our-film.mp4",
    poster: "assets/our-film-poster.jpg",
    position: "50% 50%", // Adjust the crop if needed.
  },
  photo: {
    src: "assets/our-story.jpg",
    alt: "Gypsy and David together on the Brooklyn Bridge at sunset",
  },
  welcome: "We can’t wait to celebrate this next chapter with our favourite people. A day full of love, laughter, and all of you.",
  story: "", // Optional: your story, in your own words.
  ceremony: { time: "", venue: "", address: "", mapUrl: "" },
  reception: { time: "", venue: "", address: "", mapUrl: "" },
  travel: { details: "", mapUrl: "" },
  accommodation: { details: "", bookingUrl: "" },
  dressCode: "",
  gifts: { details: "", registryUrl: "" },
  rsvp: {
    url: "", // Add the URL of your RSVP form when it is ready.
    deadline: "",
    message: "",
  },
  contactEmail: "",
  thingsToDo: { details: "", url: "" },
  questions: [], // Optional: [{ question: "Your question?", answer: "Your answer." }]
};
