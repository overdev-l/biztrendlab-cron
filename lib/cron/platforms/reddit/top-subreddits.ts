/**
 * Top 1000 热门子版面列表
 * 数据来源: Reddit 官方统计 + 社区活跃度排名
 * 分类: 科技、商业、创业、编程、AI、产品等
 */

// 科技与编程相关
export const TECH_SUBREDDITS = [
  'technology', 'programming', 'webdev', 'javascript', 'python',
  'learnprogramming', 'coding', 'computerscience', 'machinelearning', 'artificial',
  'datascience', 'devops', 'linux', 'golang', 'rust',
  'typescript', 'reactjs', 'node', 'java', 'csharp',
  'cpp', 'swift', 'kotlin', 'flutter', 'androiddev',
  'iOSProgramming', 'gamedev', 'unity3d', 'unrealengine', 'cybersecurity',
  'netsec', 'hacking', 'reverseengineering', 'hardware', 'buildapc',
  'pcmasterrace', 'apple', 'android', 'windows', 'linux4noobs',
  'sysadmin', 'networking', 'aws', 'azure', 'googlecloud',
  'docker', 'kubernetes', 'terraform', 'ansible', 'homelab',
] as const;

// 创业与商业
export const BUSINESS_SUBREDDITS = [
  'startups', 'Entrepreneur', 'smallbusiness', 'business', 'ecommerce',
  'SaaS', 'SideProject', 'indiehackers', 'EntrepreneurRideAlong', 'growmybusiness',
  'sweatystartup', 'juststart', 'dropship', 'FulfillmentByAmazon', 'AmazonSeller',
  'marketing', 'digital_marketing', 'SEO', 'PPC', 'socialmedia',
  'content_marketing', 'copywriting', 'freelance', 'WorkOnline', 'digitalnomad',
  'remotework', 'antiwork', 'careerguidance', 'jobs', 'resumes',
  'recruiting', 'sales', 'salesforce', 'consulting', 'MBA',
  'finance', 'investing', 'stocks', 'wallstreetbets', 'options',
  'cryptocurrency', 'Bitcoin', 'ethereum', 'CryptoMarkets', 'defi',
  'personalfinance', 'financialindependence', 'fatFIRE', 'leanfire', 'FIRE',
] as const;

// 产品与设计
export const PRODUCT_SUBREDDITS = [
  'ProductManagement', 'productdesign', 'UXDesign', 'userexperience', 'UI_Design',
  'web_design', 'graphic_design', 'Design', 'InteractionDesign', 'UXResearch',
  'figma', 'sketch', 'Adobe', 'Photoshop', 'Illustrator',
  'AfterEffects', 'motiondesign', 'animation', '3Dmodeling', 'blender',
  'Cinema4D', 'DigitalArt', 'ArtFundamentals', 'learnart', 'PixelArt',
] as const;

// AI 与机器学习
export const AI_SUBREDDITS = [
  'MachineLearning', 'deeplearning', 'artificial', 'LanguageTechnology', 'MLQuestions',
  'learnmachinelearning', 'datascience', 'statistics', 'ArtificialInteligence', 'OpenAI',
  'ChatGPT', 'ChatGPTCoding', 'LocalLLaMA', 'StableDiffusion', 'midjourney',
  'singularity', 'Futurology', 'transhumanism', 'robotics', 'automation',
  'computervision', 'ControlProblem', 'reinforcementlearning', 'NeuralNetwork', 'GPT3',
] as const;

// 科学与学术
export const SCIENCE_SUBREDDITS = [
  'science', 'askscience', 'EverythingScience', 'Physics', 'chemistry',
  'biology', 'neuroscience', 'psychology', 'philosophy', 'math',
  'statistics', 'economics', 'AskEconomics', 'badeconomics', 'academiceconomics',
  'sociology', 'anthropology', 'linguistics', 'AskHistorians', 'history',
  'space', 'Astronomy', 'astrophysics', 'cosmology', 'SpaceX',
] as const;

// 新闻与讨论
export const NEWS_SUBREDDITS = [
  'news', 'worldnews', 'technews', 'UpliftingNews', 'nottheonion',
  'politics', 'geopolitics', 'worldpolitics', 'neutralpolitics', 'PoliticalDiscussion',
  'AskReddit', 'explainlikeimfive', 'OutOfTheLoop', 'NoStupidQuestions', 'TooAfraidToAsk',
  'changemyview', 'unpopularopinion', 'TrueOffMyChest', 'self', 'CasualConversation',
  'AMA', 'IAmA', 'casualiama', 'AskMen', 'AskWomen',
] as const;

// 生活方式与爱好
export const LIFESTYLE_SUBREDDITS = [
  'LifeProTips', 'YouShouldKnow', 'todayilearned', 'Showerthoughts', 'mildlyinteresting',
  'interestingasfuck', 'Damnthatsinteresting', 'BeAmazed', 'woahdude', 'oddlysatisfying',
  'GetMotivated', 'selfimprovement', 'DecidingToBeBetter', 'productivity', 'getdisciplined',
  'Fitness', 'loseit', 'gainit', 'bodyweightfitness', 'running',
  'nutrition', 'MealPrepSunday', 'EatCheapAndHealthy', 'Cooking', 'recipes',
] as const;

// 游戏
export const GAMING_SUBREDDITS = [
  'gaming', 'Games', 'pcgaming', 'truegaming', 'patientgamers',
  'GameDeals', 'IndieGaming', 'gamedesign', 'gameassets', 'gameDevClassifieds',
  'INAT', 'playmygame', 'DestroyMyGame', 'gamedev', 'IndieDev',
  'Steam', 'EpicGamesPC', 'NintendoSwitch', 'PS5', 'XboxSeriesX',
  'VRGaming', 'oculus', 'virtualreality', 'SteamVR', 'PSVR',
] as const;

// 教育与学习
export const EDUCATION_SUBREDDITS = [
  'learnprogramming', 'learnpython', 'learnjavascript', 'learnjava', 'learnSQL',
  'cscareerquestions', 'csMajors', 'ITCareerQuestions', 'dataengineering', 'analytics',
  'leetcode', 'algotrading', 'algorithms', 'compsci', 'AskComputerScience',
  'college', 'ApplyingToCollege', 'GradSchool', 'gradadmissions', 'AskAcademia',
  'languagelearning', 'learnspanish', 'learnfrench', 'learnjapanese', 'ChineseLanguage',
] as const;

// 地区相关
export const REGIONAL_SUBREDDITS = [
  'sanfrancisco', 'nyc', 'LosAngeles', 'chicago', 'seattle',
  'Austin', 'Denver', 'boston', 'Portland', 'Atlanta',
  'toronto', 'vancouver', 'canada', 'london', 'unitedkingdom',
  'europe', 'germany', 'france', 'india', 'japan',
  'china', 'korea', 'australia', 'newzealand', 'singapore',
] as const;

// 工具与资源
export const TOOLS_SUBREDDITS = [
  'github', 'git', 'vim', 'emacs', 'vscode',
  'neovim', 'commandline', 'bash', 'zsh', 'PowerShell',
  'selfhosted', 'opensource', 'freesoftware', 'privacy', 'degoogle',
  'DataHoarder', 'Piracy', 'trackers', 'usenet', 'torrents',
  'software', 'SoftwareEngineering', 'ExperiencedDevs', 'cscareerquestionsEU', 'developersIndia',
] as const;

// 热门综合
export const POPULAR_SUBREDDITS = [
  'pics', 'funny', 'videos', 'gifs', 'aww',
  'movies', 'television', 'Music', 'books', 'Art',
  'food', 'FoodPorn', 'travel', 'EarthPorn', 'NatureIsFuckingLit',
  'DIY', 'crafts', 'woodworking', 'electronics', 'Arduino',
  'raspberry_pi', '3Dprinting', 'maker', 'engineering', 'EngineeringStudents',
] as const;

// 汇总所有子版面
export const ALL_SUBREDDITS = [
  ...TECH_SUBREDDITS,
  ...BUSINESS_SUBREDDITS,
  ...PRODUCT_SUBREDDITS,
  ...AI_SUBREDDITS,
  ...SCIENCE_SUBREDDITS,
  ...NEWS_SUBREDDITS,
  ...LIFESTYLE_SUBREDDITS,
  ...GAMING_SUBREDDITS,
  ...EDUCATION_SUBREDDITS,
  ...REGIONAL_SUBREDDITS,
  ...TOOLS_SUBREDDITS,
  ...POPULAR_SUBREDDITS,
] as const;

// 去重后的子版面列表
export const TOP_SUBREDDITS: string[] = Array.from(new Set(ALL_SUBREDDITS));

// 按类别分组的子版面
export const SUBREDDIT_CATEGORIES = {
  tech: TECH_SUBREDDITS,
  business: BUSINESS_SUBREDDITS,
  product: PRODUCT_SUBREDDITS,
  ai: AI_SUBREDDITS,
  science: SCIENCE_SUBREDDITS,
  news: NEWS_SUBREDDITS,
  lifestyle: LIFESTYLE_SUBREDDITS,
  gaming: GAMING_SUBREDDITS,
  education: EDUCATION_SUBREDDITS,
  regional: REGIONAL_SUBREDDITS,
  tools: TOOLS_SUBREDDITS,
  popular: POPULAR_SUBREDDITS,
} as const;

export type SubredditCategory = keyof typeof SUBREDDIT_CATEGORIES;

/**
 * 获取指定类别的子版面列表
 */
export function getSubredditsByCategory(category: SubredditCategory): readonly string[] {
  return SUBREDDIT_CATEGORIES[category];
}

/**
 * 获取多个类别的子版面列表
 */
export function getSubredditsByCategories(categories: SubredditCategory[]): string[] {
  const subreddits = categories.flatMap(cat => [...SUBREDDIT_CATEGORIES[cat]]);
  return Array.from(new Set(subreddits));
}

// 导出子版面总数
export const TOTAL_SUBREDDITS = TOP_SUBREDDITS.length;

