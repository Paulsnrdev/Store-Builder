export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

// Nigeria's 6 official geopolitical zones — used to group the state picker so
// sellers can select a whole region (e.g. "South West") at a glance instead of
// hunting through a flat alphabetical list.
export const NIGERIAN_ZONES = [
  { name: "North Central", states: ["Benue", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau", "FCT"] },
  { name: "North East", states: ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"] },
  { name: "North West", states: ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"] },
  { name: "South East", states: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"] },
  { name: "South South", states: ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"] },
  { name: "South West", states: ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"] },
] as const;
