/**
 * Bulk news seeder – adds 130 bilingual (Khmer/English) articles across all
 * categories so the site totals 200+ stories (local + global).
 *
 * Idempotent: uses INSERT OR IGNORE on the unique slug, so re-running will not
 * create duplicates.
 *
 * Run:  node scripts/seed_more_news.js
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'news.db'));

// Body paragraph pools per category (compose the 2nd & 3rd paragraphs)
const BODY = {
  1: [
    ['<p>ដំណើរការគម្រោងនេះប្រព្រឹត្តទៅតាមកាលវិភាគដែលកំណត់ដោយក្រសួងពាក់ព័ន្ធ ដោយមានការត្រួតពិនិត្យយ៉ាងតឹងរ៉ឹងពីគណៈកម្មាធិការបច្ចេកទេស។ ថ្នាក់ដឹកនាំខេត្តបានសង្កត់ធ្ងន់ថា គម្រោងនឹងផ្តល់អនិសង្ឃឹមយ៉ាងធំធេងដល់ជីវភាពរបស់ប្រជាពលរដ្ឋក្នុងតំបន់។</p>',
      '<p>Implementation is proceeding on the schedule set by the relevant ministries, under tight supervision from the technical committee. Provincial leaders stressed that the project will bring substantial benefits to residents in the area.</p>'],
    ['<p>តំណាងក្រសួងបានឱ្យដឹងថា ការសិក្សាវាយតម្លៃលទ្ធផលនឹងធ្វើឡើងជាដំណាក់កាល ដើម្បីធានាបាននូវគុណភាព និងប្រសិទ្ធភាពនៃការអនុវត្ត។ នៅសប្តាហ៍ខាងមុខ ក្រុមការងារបច្ចេកទេសនឹងចុះត្រួតពិនិត្យផ្ទាល់នៅទីតាំង។</p>',
      '<p>Ministry representatives said phased impact assessments will be carried out to guarantee quality and efficiency of execution. The technical task force is scheduled to conduct an on-site inspection next week.</p>'],
    ['<p>ប្រជាពលរដ្ឋក្នុងតំបន់បានសម្តែងការសាទរចំពោះសកម្មភាពនេះ ដោយរំពឹងថានឹងជួយកាត់បន្ថយចំណាយ និងសម្រួលដល់ការធ្វើដំណើរ និងការរស់នៅប្រចាំថ្ងៃ។ ពួកគេស្នើឱ្យអាជ្ញាធរបន្តកិច្ចប្រឹងប្រែងនេះនៅតំបន់ដទៃទៀតផងដែរ។</p>',
      '<p>Local residents welcomed the move, expecting it to cut costs and ease daily travel and living. They urged the authorities to extend the initiative to other areas as well.</p>']
  ],
  2: [
    ['<p>វិភាគិកអន្តរជាតិចាត់ទុកព្រឹត្តិការណ៍នេះជាជំហានសំខាន់ក្នុងការពង្រឹងស្ថិរភាព និងកិច្ចសហប្រតិបត្តិការក្នុងតំបន់។ បណ្តាប្រទេសជាសមាជិកបានសន្យាបន្តការចរចានៅកម្រិតបច្ចេកទេសនៅដំណាក់កាលបន្ទាប់។</p>',
      '<p>International analysts regard the event as a crucial step toward strengthening regional stability and cooperation. Member states pledged to continue technical-level talks in the next phase.</p>'],
    ['<p>របាយការណ៍ពីទីភ្នាក់ងារព័ត៌មានអន្តរជាតិបានគូសបញ្ជាក់ថា ប្រទេសជិតខាងជាច្រើនត្រៀមខ្លួនចូលរួមជាមួយកិច្ចព្រមព្រៀងនេះ ខណៈស្ថាប័នហិរញ្ញវត្ថុពិភពលោកវាយតម្លៃវិជ្ជមានចំពោះផលប៉ះពាល់សេដ្ឋកិច្ច។</p>',
      '<p>Reports from international news agencies highlighted that neighbouring countries are ready to join the accord, while global financial institutions assessed its economic impact positively.</p>'],
    ['<p>អ្នកជំនាញបានព្យាករណ៍ថា លទ្ធផលនៃការសម្រេចចិត្តលើកនេះអាចជះឥទ្ធិពលយ៉ាងទូលំទូលាយលើទីផ្សារសកលក្នុងរយៈពេលប៉ុន្មានខែខាងមុខ ខណៈទិសដៅនយោបាយថ្មីៗកំពុងលេចរូបរាងឡើង។</p>',
      '<p>Experts forecast that the decision could broadly influence global markets over the coming months, as new policy directions take shape.</p>']
  ],
  3: [
    ['<p>គណៈកម្មាធិការប្រកួតបានបញ្ជាក់ថា ការប្រកួតនឹងប្រព្រឹត្តទៅតាមស្តង់ដារសហព័ន្ធអន្តរជាតិ ដោយមានការដំឡើងបច្ចេកវិទ្យាជំនួយការវិនិច្ឆ័យទាន់សម័យ។ អ្នកគាំទ្ររំពឹងថាកន្លែងប្រកួតនឹងពេញលេញ។</p>',
      '<p>The organising committee confirmed the competition will follow international federation standards, with modern referee-assistance technology installed. Fans are expected to fill the venue.</p>'],
    ['<p>វគ្គហ្វឹកហាត់បានដំណើរការយ៉ាងខ្លាំងក្លាអស់រយៈពេលជាច្រើនសប្តាហ៍ ក្រោមការដឹកនាំរបស់គ្រូបង្វឹកជាតិ និងអន្តរជាតិ។ កីឡាករសំខាន់ៗសុទ្ធតែមានសុខភាពល្អពេញលេញសម្រាប់ការប្រកួតខាងមុខ។</p>',
      '<p>Intensive training camps have run for several weeks under national and international coaches. Key athletes are all reported to be in full health for the upcoming fixtures.</p>'],
    ['<p>សហព័ន្ធកីឡាជាតិបានសន្យាថានឹងបន្តការណ៍គាំទ្រការអភិវឌ្ឍកីឡាមូលដ្ឋាន ដើម្បីបង្កើតខ្សែសង្វាក់កីឡាករវ័យក្មេងជំនាន់ក្រោយ។ កម្មវិធីហ្វឹកហាត់ត្រូវបានដាក់ឱ្យប្រើប្រាស់នៅគ្រប់ខេត្ត។</p>',
      '<p>The national federation pledged to keep investing in grassroots development to build the next generation of talent. Training programmes have been rolled out across all provinces.</p>']
  ],
  4: [
    ['<p>អ្នកជំនាញបានឱ្យដឹងថា ដំណោះស្រាយថ្មីនេះប្រើបច្ចេកវិទ្យាស្វ័យសិក្សាម៉ាស៊ីន និងការវិភាគទិន្នន័យធំ ដើម្បីបង្កើនប្រសិទ្ធភាព និងសុវត្ថិភាពសម្រាប់អ្នកប្រើប្រាស់។ ស្ថាប័នជាច្រើនត្រៀមខ្លួនអនុវត្តតាម។</p>',
      '<p>Industry specialists said the new solution leverages machine learning and big-data analytics to improve efficiency and safety for users, with multiple institutions preparing to adopt it.</p>'],
    ['<p>វិស័យស្តាតអាប់ក្នុងស្រុកកំពុងទទួលបានមូលនិធិវិនិយោគកើនឡើងជាលំដាប់ ដោយទាក់ទាញវិនិយោគិនតំបន់ និងអន្តរជាតិ។ ក្រុមវិស្វករខ្មែរជាច្រើនបានបង្កើតផលិតផលថ្មីៗជាបន្តបន្ទាប់។</p>',
      '<p>The local start-up ecosystem continues to attract rising venture funding from regional and international investors, while Khmer engineering teams keep shipping new products.</p>'],
    ['<p>អ្នកជំនាញសុវត្ថិភាពព័ត៌មានបានព្រមានអំពីការបង្កើនការវាយប្រហារតាមអនឡាញ ហើយណែនាំឱ្យស្ថាប័ន និងបុគ្គលពង្រឹងប្រព័ន្ធការពារ ការផ្លាស់ប្តូរពាក្យសម្ងាត់ និងការប្រើប្រាស់ការផ្ទៀងផ្ទាត់ពីរជាន់។</p>',
      '<p>Cybersecurity experts warned of rising online attacks, urging organisations and individuals to harden defences, rotate passwords, and adopt two-factor authentication.</p>']
  ],
  5: [
    ['<p>ធនាគារកណ្តាលបានប្រកាសថា ស្ថិរភាពម៉ាក្រូសេដ្ឋកិច្ចនៅតែរក្សាបាន ខណៈអតិផរណាស្ថិតក្នុងកម្រិតត្រួតពិនិត្យ ហើយប្រាក់ចំណូលពីការនាំចេញបន្តកើនឡើងជាបន្តបន្ទាប់។</p>',
      '<p>The central bank reported that macroeconomic stability is being maintained, with inflation within the target band and export earnings continuing to climb.</p>'],
    ['<p>វិនិយោគិនបរទេសបានបង្ហាញការទុកចិត្តលើទីផ្សារកម្ពុជា តាមរយៈគម្រោងថ្មីៗក្នុងវិស័យកសិកម្ម ផលិតកម្ម និងសេវាកម្ម។ តំបន់សេដ្ឋកិច្ចពិសេសកំពុងពង្រីកហេដ្ឋារចនាសម្ព័ន្ធទំនើប។</p>',
      '<p>Foreign investors showed continued confidence in the Cambodian market through new projects in agriculture, manufacturing, and services, while special economic zones expand modern infrastructure.</p>'],
    ['<p>អ្នកវិភាគបានសង្កត់ធ្ងន់ថា ការពង្រឹងបរិយាកាសឌីជីថល និងការបណ្តុះបណ្តាលធនធានមនុស្សគឺជាគន្លឹះសំខាន់សម្រាប់លើកកម្ពស់សមត្ថភាពប្រកួតប្រជែងរបស់សេដ្ឋកិច្ចជាតិ។</p>',
      '<p>Analysts emphasised that strengthening the digital landscape and workforce training are key to lifting the competitiveness of the national economy.</p>']
  ]
};

// { c: category, km: title_km, en: title_en, s: slug, sk: summary_km, se: summary_en, i: image seed }
const ARTICLES = [
  // ============ CATEGORY 1: NATIONAL / LOCAL (35) ============
  { c: 1, km: 'ក្រសួងមហាផ្ទៃបើកយុទ្ធនាការបង្រ្កាបការនេសាទខុសច្បាប់តាមបណ្តាខេត្តริมទន្លេ និងឆ្នេរសមុទ្រ', en: 'Interior Ministry Launches Nationwide Crackdown on Illegal Fishing', s: 'illegal-fishing-crackdown-2026', sk: 'ក្រសួងមហាផ្ទៃចាប់ផ្តើមយុទ្ធនាការជាតិមួយដើម្បីបង្រ្កាបការនេសាទខុសច្បាប់ និងការពារប្រភពជលផល។', se: 'The Ministry of Interior launched a nationwide campaign to crack down on illegal fishing and protect fishery resources.', i: 'mekong-guard' },
  { c: 1, km: 'ព្រឹត្តិការណ៍ទេសចរណ៍ជាតិ «ទស្សនកិច្ចស្រុកខ្មែរ» ទាក់ទាញភ្ញៀវជាង ២ លាននាក់', en: 'Visit Cambodia Year Event Draws Over Two Million Visitors', s: 'visit-cambodia-two-million-2026', sk: 'ព្រឹត្តិការណ៍ទេសចរណ៍ជាតិប្រចាំឆ្នាំទាក់ទាញភ្ញៀវជាតិ និងអន្តរជាតិចូលរួមយ៉ាងច្រើនកុះករ។', se: 'The annual domestic tourism campaign drew over two million local and international visitors.', i: 'khmer-travel' },
  { c: 1, km: 'ខេត្តសៀមរាបដាក់ឱ្យប្រើប្រាស់ប្រព័ន្ធភ្ញៀវឌីជីថលនៅចំណុចប្រទាក់អង្គរ', en: 'Siem Reap Rolls Out Digital Ticketing at Angkor Park Entrances', s: 'angkor-digital-ticketing-2026', sk: 'ប្រព័ន្ធភ្ញៀវឌីជីថលថ្មីជួយកាត់បន្ថយពេលវេលារង់ចាំ និងបង្កើនប្រសិទ្ធភាពគ្រប់គ្រងចំនួនភ្ញៀវ។', se: 'A new digital ticketing system at Angkor checkpoints cuts queue times and improves visitor flow management.', i: 'angkor-digital' },
  { c: 1, km: 'គម្រោងទឹកស្អាតសម្រាប់សហគមន៍ជនបទនៅខេត្តកំពង់ធំ និងព្រះវិហារ', en: 'Clean Water Project Reaches Rural Communities in Kampong Thom and Preah Vihear', s: 'rural-clean-water-project-2026', sk: 'គម្រោងរយៈពេល ៥ ឆ្នាំផ្តល់ទឹកស្អាតដល់សហគមន៍ជនបទជាង ២០០ កន្លែង។', se: 'A five-year programme delivers clean water to more than 200 rural communities in Kampong Thom and Preah Vihear.', i: 'rural-water' },
  { c: 1, km: 'ក្រសួងសាធារណការដំឡើងប្រព័ន្ធកាមែរចរាចរណ៍ឆ្លាតវៃនៅតំបន់ប្រសព្វសំខាន់ៗក្នុងរាជធានី', en: 'Smart AI Traffic Cameras Installed at Key Phnom Penh Intersections', s: 'smart-traffic-cameras-pp-2026', sk: 'ប្រព័ន្ធកាមែរ AI ចាប់ផ្តើមដំណើរការនៅតាមទីប្រសព្វធំៗ ដើម្បីគ្រប់គ្រងចរាចរណ៍ និងកាត់បន្ថយគ្រោះថ្នាក់ចរាចរណ៍។', se: 'Smart AI traffic cameras go live at major Phnom Penh intersections to manage flow and reduce accidents.', i: 'smart-traffic' },
  { c: 1, km: 'ក្រសួងសុខាភិបាលផ្ញើគ្រូពេទ្យឯកទេសទៅមន្ទីរពេទ្យខេត្តគោលដៅ ១៥', en: 'Specialist Doctors Deployed to Fifteen Provincial Hospitals', s: 'specialist-doctors-provinces-2026', sk: 'កម្មវិធីផ្ញើគ្រូពេទ្យជំនាញទៅខេត្តគោលដៅ ១៥ កាត់បន្ថយការធ្វើដំណើរទៅភ្នំពេញ។', se: 'A specialist-doctor deployment scheme to fifteen provinces reduces referrals to the capital.', i: 'hospital-outreach' },
  { c: 1, km: 'សហព័ន្ធស្រូវជាតិប្រកាសផែនការពង្រីកការនាំចេញស្រូវគុណភាពខ្ពស់', en: 'Federation Unveils Plan to Expand Premium Rice Exports', s: 'premium-rice-export-plan-2026', sk: 'គុណភាព និងបរិមាណស្រូវនាំចេញកំពុងកើនឡើង ខណៈទីផ្សារថ្មីនៅអាហ្វ្រិក និងអាមេរិកឡាទីនត្រូវបានបើក។', se: 'Premium rice exports rise in volume and quality as new African and Latin American markets open.', i: 'rice-export' },
  { c: 1, km: 'ក្រុងបាត់ដំបងសម្ពោធសួលសាធារណៈថ្មីជាមួយលំហកីឡា និងស្ពានថ្មើរជើងវែង', en: 'Battambang Inaugurates New Public Park with Sports Zones and Long Walking Bridge', s: 'battambang-public-park-2026', sk: 'សួងសាធារណៈថ្មីមានលំហកីឡា ស្ពានថ្មើរជើង និងប្រព័ន្ធភ្លើងបំភ្លឺសូឡាពេញលេញ។', se: 'The new public park features sports zones, a long pedestrian bridge, and full solar lighting.', i: 'battambang-park' },
  { c: 1, km: 'អាជ្ញាធរផ្លូវប្រកាសប្រព័ន្ធពន្ទាក់អ៊ីឡិចត្រូនិកពេញលេញតាមផ្លូវជាតិលេខ ៥', en: 'Full Electronic Toll Collection Launches on National Road 5', s: 'ets-national-road5-2026', sk: 'ប្រព័ន្ធបង់ថ្លៃឆ្លងកាត់អ៊ីឡិចត្រូនិកថ្មីបង្កើនល្បឿនចរាចរណ៍ និងកាត់បន្ថយបញ្ហាបច្ចេកទេស។', se: 'Fully electronic toll collection on National Road 5 speeds up traffic and reduces technical issues.', i: 'ets-toll' },
  { c: 1, km: 'កម្មវិធីបណ្តុះបណ្តាលគ្រូទំនើបជាង ៥,០០០ នាក់សម្រាប់ឆ្នាំសិក្សាថ្មី', en: 'Over 5,000 Teachers Complete Modern Training for New School Year', s: 'teacher-training-5000-2026', sk: 'វគ្គបណ្តុះបណ្តាលគ្រូផ្តោតលើបច្ចេកវិទ្យាបង្រៀន និងការវាយតម្លៃសិស្សបែបថ្មី។', se: 'Over 5,000 teachers completed modern training focused on digital pedagogy and new assessment methods.', i: 'teacher-training' },
  { c: 1, km: 'គម្រោងរថភ្លើងភ្ជាប់រាជធានីជាមួយខេត្តព្រះសីហនុដល់វគ្គសិក្សាបច្ចេកទេស', en: 'Phnom Penh–Sihanoukville Rail Link Enters Technical Study Phase', s: 'pp-sihanoukville-rail-study-2026', sk: 'ការសិក្សាវាយតម្លៃបច្ចេកទេសសម្រាប់បណ្តាញរថភ្លើងដឹកជញ្ជូនទំនិញ និងអ្នកដំណើរកំពុងដំណើរការ។', se: 'Technical feasibility studies progress for a rail line linking the capital to Sihanoukville.', i: 'rail-sihanouk' },
  { c: 1, km: 'ក្រសួងវប្បធម៌បើកពិព័រណ៍សៀវភៅជាតិ ជាមួយការប្រកួតសរសេរសម្រាប់យុវជន', en: 'Ministry of Culture Opens National Book Fair with Youth Writing Contest', s: 'national-book-fair-2026', sk: 'ពិព័រណ៍សៀវភៅប្រចាំឆ្នាំទាក់ទាញអ្នកនិពន្ធ ផលិតករ និងអ្នកអានរាប់ម៉ឺននាក់។', se: 'The annual national book fair gathered authors, publishers, and tens of thousands of readers.', i: 'book-fair' },
  { c: 1, km: 'មូលនិធិជាតិគ្រប់គ្រងគ្រោះមហន្តរាយប្រគល់អំណោយជូនប្រជាពលរដ្ឋរងគ្រោះទឹកជំនន់នៅតាកែវ', en: 'Emergency Relief Delivered to Flood-Affected Families in Takeo', s: 'takeo-flood-relief-2026', sk: 'ក្រុមសង្គ្រោះបានចុះដល់តំបន់រងគ្រោះ ព្រមទាំងបញ្ជូនអំណោយជូនគ្រួសាររងផលប៉ះពាល់។', se: 'Relief teams reached flooded districts in Takeo with emergency aid for affected families.', i: 'takeo-flood' },
  { c: 1, km: 'ខេត្តកំពង់ចាមអនុម័តផែនការមេអភិវឌ្ឍន៍ទីក្រុងបៃតងរយៈពេល ១០ ឆ្នាំ', en: 'Kampong Cham Approves Ten-Year Green City Masterplan', s: 'kampong-cham-green-masterplan-2026', sk: 'ផែនការមេផ្តោតលើការដាំដើមឈើក្នុងក្រុង ថាមពលស្អាត និងទឹកស្អាតសម្រាប់អនាគត។', se: 'Kampong Cham approved a 10-year green city masterplan targeting urban trees and clean water.', i: 'green-city' },
  { c: 1, km: 'ស្ថិតិ៖ ចំនួនភ្ញៀវទេសចរអន្តរជាតិមកកម្ពុជា ៩ ខែកើនឡើង ២៥%', en: 'International Tourist Arrivals to Cambodia Up 25% in Nine Months', s: 'tourist-arrivals-up-25pc-2026', sk: 'វិស័យទេសចរណ៍បន្តការងើបឡើងវិញខ្លាំង ដោយមានការកើនឡើងពីទីផ្សារអាស៊ី។', se: 'Tourist arrivals up 25% in nine months, with Asian markets leading the recovery.', i: 'tourism-stats' },
  { c: 1, km: 'ក្រសួងពាណិជ្ជកម្មដាក់បទដ្ឋានថ្មីសម្រាប់ទីផ្សារលក់អនឡាញ និងការពារអ្នកប្រើប្រាស់', en: 'Commerce Ministry Sets New Standards for Online Marketplaces', s: 'ecommerce-consumer-standards-2026', sk: 'បទដ្ឋានថ្មីតម្រូវឱ្យវេទិកាលក់អនឡាញបញ្ជាក់ព័ត៌មានផលិតផល និងគោលនយោបាយទូទាត់ច្បាស់លាស់។', se: 'New standards require online marketplaces to disclose product and payment policies clearly.', i: 'ecommerce-rule' },
  { c: 1, km: 'សាកលវិទ្យាល័យបើកមហាវិទ្យាល័យបច្ចេកវិទ្យាឌីជីថល ជាមួយអាហារូបករណ៍ ៣០០', en: 'University Opens Digital Technology Faculty with 300 Scholarships', s: 'digital-tech-faculty-scholarships-2026', sk: 'មហាវិទ្យាល័យថ្មីផ្តល់វគ្គសិក្សាស្តីពី AI សុវត្ថិភាពព័ត៌មាន និងវិស្វកម្មទិន្នន័យ។', se: 'The new digital tech faculty offers degrees in AI, cybersecurity, and data engineering with 300 scholarships.', i: 'uni-digital' },
  { c: 1, km: 'អាជ្ញាធរប្រកាសតំបន់ការពារឆ្នេរនៅកែប និងព្រះសីហនុ', en: 'Coastal Protection Zones Declared in Kep and Sihanoukville', s: 'coastal-protection-zones-2026', sk: 'ផែនការគ្រប់គ្រងឆ្នេរថ្មីកំណត់តំបន់ហាមឃាត់ការសាងសង់ និងការពារប្រព័ន្ធអេកូឡូស៊ី។', se: 'Coastal authorities designated protected beach zones in Kep and Sihanoukville.', i: 'beach-protect' },
  { c: 1, km: 'គម្រោងស្ថានីយអ៊ីដ្រូសែនបៃតងដំបូងរបស់កម្ពុជាត្រូវបានអនុម័ត', en: 'Cambodia\'s First Green Hydrogen Pilot Station Approved', s: 'green-hydrogen-station-2026', sk: 'ស្ថានីយផលិតអ៊ីដ្រូសែនបៃតងសាកល្បងនឹងបម្រើសេវាដល់វិស័យដឹកជញ្ជូនសាធារណៈ។', se: 'A first green-hydrogen pilot station will serve the public transport sector.', i: 'hydrogen-station' },
  { c: 1, km: 'យុទ្ធនាការចាក់វ៉ាក់សាំងការពារជំងឺគ្រុនឈាមជូនសិស្សានុសិស្សនៅតំបន់ជនបទ', en: 'Dengue Vaccination Drive Reaches Rural School Students', s: 'dengue-vaccine-schools-2026', sk: 'ក្រុមការងារសុខាភិបាលបានចាក់វ៉ាក់សាំងដល់សាលារៀនជាង ២,០០០ នៅតំបន់គ្រោះថ្នាក់។', se: 'Health teams vaccinated students at over 2,000 rural schools against dengue.', i: 'dengue-vaccine' },
  { c: 1, km: 'គណៈកម្មការប្រឆាំងអំពើពុករលាយបង្ហាញរបាយការណ៍ប្រចាំឆ្នាំស្តីពីកំណែទម្រង់', en: 'Anti-Corruption Unit Publishes Annual Reform Progress Report', s: 'acu-annual-reform-report-2026', sk: 'របាយការណ៍បានបង្ហាញវឌ្ឍនភាពលើកំណែទម្រង់តុលាការ និងសេវានីតិវិធីរដ្ឋបាល។', se: 'The annual report highlighted progress in judicial reform and administrative legal services.', i: 'rule-of-law' },
  { c: 1, km: 'អាកាសយានដ្ឋានអន្តរជាតិថ្មីភ្នំពេញ៖ ការសាងសង់ឈានដល់ ៧០%', en: 'New Phnom Penh International Airport Construction Reaches 70%', s: 'new-airport-70-percent-2026', sk: 'គម្រោងអាកាសយានដ្ឋានធំបំផុតរបស់កម្ពុជានៅតាមផែនការ ជាមួយគោលដៅបើកដំណើរការ។', se: 'Construction of the country\'s largest airport reached 70%, staying on schedule.', i: 'new-airport' },
  { c: 1, km: 'ក្រសួងប្រកាសគម្រោងបញ្ជីដីឌីជីថលជាតិ សម្រាប់ដីទាំងអស់ក្នុងប្រទេស', en: 'National Digital Land Registration Programme Announced', s: 'digital-land-registration-2026', sk: 'ប្រព័ន្ធបញ្ជីដីឌីជីថលនឹងបង្កើនតម្លាភាព និងកាត់បន្ថយវិវាទដីធ្លី។', se: 'The digital land registration rollout aims to boost transparency and cut disputes.', i: 'digital-land' },
  { c: 1, km: 'សហគមន៍នេសាទទន្លេសាបទទួលបានការគាំទ្របច្ចេកទេសចិញ្ចឹមត្រីក្នុងកង', en: 'Tonle Sap Fishing Communities Get Cage Aquaculture Support', s: 'tonlesap-cage-aquaculture-2026', sk: 'គម្រោងជំនួយផ្តល់គ្រឿងឧបករណ៍ និងវគ្គបណ្តុះបណ្តាលដល់ពិរជននេសាទ។', se: 'A support project supplies equipment and training to Tonle Sap fishing communities.', i: 'tonlesap-fish' },
  { c: 1, km: '«ថ្ងៃវប្បធម៌ខ្មែរ» ត្រូវបានប្រារព្ធនៅទីក្រុងធំៗជាមួយការបង្ហាញរបាំព្រះរាជទ្រព្យ', en: 'Khmer Culture Day Showcases Royal Ballet in Major World Cities', s: 'khmer-culture-day-world-2026', sk: 'ស្ថានទូតកម្ពុជាប្រារព្ធពិធីបង្ហាញវប្បធម៌នៅទីក្រុងធំៗជាច្រើន។', se: 'Cambodian embassies showcased royal ballet and culture in major world cities.', i: 'culture-abroad' },
  { c: 1, km: 'គណៈកម្មការជាតិបន្ថែមសកម្មភាពប្រឆាំងគ្រឿងញៀននៅតាមសាលារៀន', en: 'National Authority Expands Anti-Drug Programmes in Schools', s: 'school-anti-drug-drive-2026', sk: 'កម្មវិធីអប់រំផ្តល់ចំណេះដឹងអំពីផលប៉ះពាល់គ្រឿងញៀនដល់សិស្សវិទ្យាល័យ។', se: 'Anti-drug programmes expanded school outreach on substance abuse for secondary students.', i: 'anti-drug' },
  { c: 1, km: 'អ្នកលក់រាយធំៗប្រកាសពង្រីកបណ្តាញចែកចាយទៅតាមខេត្ត', en: 'Major Retailers Expand Distribution Networks into Provinces', s: 'retail-province-expansion-2026', sk: 'បណ្តាញហាងលក់រាយតូច និងធំកំពុងរីកចម្រើនតាមខេត្តទូទាំងប្រទេស។', se: 'Major retailers are expanding distribution networks into provincial markets.', i: 'retail-expansion' },
  { c: 1, km: 'ក្រសួងសង្គមកិច្ចបើកមណ្ឌលប្រឹក្សាយោបល់ថ្មីសម្រាប់ស្ត្រី និងកុមារ', en: 'New Counselling and Support Centres Open for Women and Children', s: 'women-child-support-centres-2026', sk: 'មណ្ឌលថ្មីផ្តល់សេវាប្រឹក្សា និងជំនួយសង្គ្រោះបន្ទាន់ដល់ស្ត្រី និងកុមារ។', se: 'New centres offer counselling and emergency support services for women and children.', i: 'care-centre' },
  { c: 1, km: 'យុវជនខ្មែរឈ្នះរង្វាន់នៅការប្រកួតសរសេរកំណាព្យអន្តរជាតិ', en: 'Khmer Youth Win Prizes at International Poetry Competition', s: 'khmer-youth-poetry-awards-2026', sk: 'សិស្សថ្នាក់ជាតិទទួលបានរង្វាន់នៅក្នុងការប្រកួតសរសេរភាសាអង់គ្លេស។', se: 'Khmer students won awards at an international writing competition.', i: 'youth-essay' },
  { c: 1, km: 'រាជធានីបន្តគម្រោងដាក់ខ្សែកាបអគ្គិសនី និងអ៊ីនធឺណិតក្រោមដី', en: 'Phnom Penh Continues Underground Power and Internet Cabling', s: 'underground-cabling-pp-2026', sk: 'ការប្រមូលផ្តុំខ្សែភ្លើង និងអ៊ីនធឺណិតក្រោមដីកំពុងបន្តនៅតាមដងផ្លូវធំ។', se: 'Underground cabling for power and internet continues along major boulevards.', i: 'underground-cable' },
  { c: 1, km: 'វិទ្យាស្ថានជាតិប្រកាសវេទិកាទិន្នន័យស្ថិតិឌីជីថលថ្មី', en: 'National Institute Launches New Digital Statistics Platform', s: 'digital-statistics-platform-2026', sk: 'ទិន្នន័យប្រជាសាស្ត្រ និងសេដ្ឋកិច្ចសង្គមនឹងមានលក្ខណៈឆាប់រហ័ស និងត្រឹមត្រូវជាងមុន។', se: 'The national institute launched a digital statistical platform for faster and more accurate data.', i: 'census-data' },
  { c: 1, km: 'កម្ពុជា និងជប៉ុនចុះហត្ថលេខាលើគម្រោងស្ពានថ្មីនៅខេត្តកណ្តាល', en: 'Cambodia and Japan Sign Deal for New Kandal Bridge', s: 'japan-kandal-bridge-deal-2026', sk: 'ស្ពានថ្មីដែលវិនិយោគដោយ ODA ជប៉ុននឹងពង្រីកការតភ្ជាប់តំបន់។', se: 'A Japanese-funded bridge in Kandal will strengthen regional connectivity.', i: 'kandal-bridge' },
  { c: 1, km: 'គម្រោងរដ្ឋបាលឌីជីថល «២០៣០» សម្រួលសេវាសាធារណៈជាង ៥០ បន្ថែមអនឡាញ', en: 'Digital Government 2030 Adds Fifty Online Public Services', s: 'egov-2030-online-services-2026', sk: 'ពលរដ្ឋអាចធ្វើប្រតិបត្តិការរដ្ឋបាលជាច្រើនសេវាតាមអនឡាញ។', se: 'New e-government services let citizens complete more procedures online.', i: 'egov-portal' },
  { c: 1, km: 'កសិករខេត្តកំពតទទួលតម្លៃល្អសម្រាប់ដំណាំស្វាយក្នុងរដូវប្រមូលផល', en: 'Kampot Farmers Enjoy Strong Mango Prices at Harvest', s: 'kampot-mango-harvest-prices-2026', sk: 'តម្រូវការនាំចេញកំពុងរុញតម្លៃស្វាយឱ្យឡើងខ្ពស់។', se: 'Export demand lifts mango prices for Kampot farmers this harvest season.', i: 'mango-price' },
  { c: 1, km: 'ក្រសួងជលផលបើកមជ្ឈមណ្ឌលបណ្តុះពូជត្រីថ្មី គាំទ្រការអភិរក្ស', en: 'Fisheries Ministry Opens New Hatchery for Conservation and Farming', s: 'fish-hatchery-conservation-2026', sk: 'មជ្ឈមណ្ឌលបណ្តុះពូជត្រីថ្មីបំពេញតម្រូវការសម្រាប់ការចិញ្ចឹម និងអភិរក្ស។', se: 'New hatcheries support conservation breeding and community fish farming.', i: 'fish-hatchery' },

  // ============ CATEGORY 2: INTERNATIONAL / GLOBAL (35) ============
  { c: 2, km: 'កិច្ចប្រជុំកំពូល G20 ឈានដល់កិច្ចព្រមព្រៀងស្តីពីពាណិជ្ជកម្មឌីជីថល', en: 'G20 Summit Reaches Accord on Digital Trade Rules', s: 'g20-digital-trade-accord-2026', sk: 'ថ្នាក់ដឹកនាំឯកភាពលើក្របខ័ណ្ឌគោលការណ៍ពាណិជ្ជកម្មឌីជីថលសកល។', se: 'G20 leaders agreed on a framework for global digital trade cooperation.', i: 'g20-digital' },
  { c: 2, km: 'តម្លៃប្រេងពិភពលោកផ្លាស់ប្តូរខ្លាំងក្រោយសេចក្តីថ្លែងការណ៍ OPEC', en: 'Global Oil Prices Swing After OPEC+ Statement', s: 'opec-price-swing-2026', sk: 'តម្លៃប្រេងឡើងវិញខណៈក្រុមប្រទេសផលិតរក្សាកម្រិតការផលិត។', se: 'Oil prices climbed after OPEC+ reaffirmed production curbs.', i: 'oil-market' },
  { c: 2, km: 'សហភាពអឺរ៉ុបអនុម័តច្បាប់កំពូលគ្រប់គ្រងបច្ចេកវិទ្យា AI', en: 'EU Adopts Landmark AI Regulation Act', s: 'eu-ai-act-adopted-2026', sk: 'ច្បាប់ AI ថ្មីតម្រូវឱ្យមានតម្លាភាព និងការគ្រប់គ្រងហានិភ័យសម្រាប់ប្រព័ន្ធឆ្លងកាត់។', se: 'The EU adopted its landmark AI Act requiring transparency and risk management.', i: 'eu-ai-act' },
  { c: 2, km: 'របាយការណ៍ប្រជាសាស្ត្រពិភពលោក៖ អត្រាកំណើតទន់ភ្លន់នៅអាស៊ីប៉ាស៊ីហ្វិក', en: 'World Population Report Shows Slowing Growth in Asia-Pacific', s: 'population-growth-slowing-2026', sk: 'របាយការណ៍ពិភពលោកព្យាករណ៍ពីការផ្លាស់ប្តូររចនាសម្ព័ន្ធប្រជាសាស្ត្រ។', se: 'World population projections show slowing growth across Asia-Pacific.', i: 'population-report' },
  { c: 2, km: 'សាកលវិទ្យាល័យអាមេរិកបើកកម្មវិធីអាហារូបករណ៍ថ្មីសម្រាប់និស្សិតអាស៊ាន', en: 'US Universities Launch New Scholarships for ASEAN Students', s: 'us-asean-scholarships-2026', sk: 'កម្មវិធីថ្មីបង្កើតឱកាសសិក្សា និងស្រាវជ្រាវរួមគ្នា។', se: 'US universities expanded scholarship programmes for ASEAN students.', i: 'us-scholarship' },
  { c: 2, km: 'សេដ្ឋកិច្ចចិន៖ វិស័យនាំចេញ និងបច្ចេកវិទ្យាបន្តរីកលឿន', en: 'China\'s Tech- and Export-Led Growth Continues', s: 'china-tech-export-growth-2026', sk: 'ស្ថិតិផ្លូវការរបស់ចិនប្រកាសពីកំណើនផលិតកម្មឧស្សាហកម្ម។', se: 'China reported solid industrial output growth led by tech and exports.', i: 'china-economy' },
  { c: 2, km: 'អង្គការសុខភាពពិភពលោកចេញការណែនាំថ្មីស្តីពីការត្រៀមប្រឆាំងរាលដាល', en: 'WHO Issues Updated Pandemic Preparedness Guidance', s: 'who-pandemic-guidance-2026', sk: 'ការណែនាំថ្មីផ្តោតលើប្រព័ន្ធផ្សាយព័ត៌មានពីមុខ និងការចាក់វ៉ាក់សាំង។', se: 'WHO issued updated pandemic preparedness guidelines focused on early warning systems.', i: 'who-guidelines' },
  { c: 2, km: 'ទីក្រុងធំៗនៅអឺរ៉ុបប្រកាសកាលវិភាគហាមឃាត់រថយន្តប្រេងកាត', en: 'Major EU Cities Set Timelines to Phase Out Petrol Cars', s: 'eu-city-ev-mandates-2026', sk: 'ទីក្រុងជាច្រើនកំណត់តារាងបញ្ឈប់ការប្រើរថយន្តប្រេងកាត។', se: 'Several major European cities announced timelines to ban combustion engines.', i: 'ev-cities' },
  { c: 2, km: 'ការស្រាវជ្រាវថ្មី៖ កម្រិតទឹកសមុទ្រឡើងលឿនជាងការប៉ាន់ស្មាន', en: 'New Study Finds Sea-Level Rise Accelerating Beyond Estimates', s: 'sea-level-rise-study-2026', sk: 'ការសិក្សាវិទ្យាសាស្ត្រថ្មីបង្ហាញពីអត្រាកំណើនទឹកសមុទ្រខ្ពស់ជាងមុន។', se: 'New research suggests sea-level rise is accelerating beyond prior estimates.', i: 'sea-level' },
  { c: 2, km: 'ក្រុមហ៊ុនបច្ចេកវិទ្យាយក្សជំពាក់កិច្ចសន្យាថាមពលនុយក្លេអ៊ែរសម្រាប់មជ្ឈមណ្ឌលទិន្នន័យ', en: 'Tech Giants Turn to Nuclear Power for Data Centres', s: 'nuclear-data-centre-deals-2026', sk: 'កិច្ចព្រមព្រៀងថាមពលថ្មីៗជាមួយរ៉េអាក់ទរតូចៗ។', se: 'Tech giants signed deals with small modular reactor firms to power data centres.', i: 'nuclear-data' },
  { c: 2, km: 'អត្រាការប្រាក់ពិភពលោកថយចុះខណៈធនាគារកណ្តាលបន្ធូរគោលនយោបាយ', en: 'Global Interest Rates Ease as Central Banks Soften Stance', s: 'global-rate-easing-cycle-2026', sk: 'ធនាគារកណ្តាលជាច្រើនបានកាត់បន្ថយអត្រាការប្រាក់ជាបន្តបន្ទាប់។', se: 'Global interest rates trended lower as central banks began easing cycles.', i: 'rates-global' },
  { c: 2, km: 'សេចក្តីថ្លែងការណ៍ COP៖ កម្រិតការបញ្ចេញឧស្ម័នផ្ទះកញ្ចក់ថ្មី', en: 'COP Summit Yields Stronger 2035 Emissions Pledges', s: 'cop-stronger-pledges-2026', sk: 'បណ្តាប្រទេសសន្យាកាត់បន្ថយការបញ្ចេញឧស្ម័នឆ្នាំ ២០៣៥។', se: 'COP talks concluded with strengthened 2035 emissions-reduction pledges.', i: 'cop-pledge' },
  { c: 2, km: 'តម្លៃដឹកជញ្ជូនទំនិញសកលធ្លាក់ដល់កម្រិតទាបបំផុតរយៈពេល ២ ឆ្នាំ', en: 'Global Freight Rates Hit Two-Year Low', s: 'freight-rates-two-year-low-2026', sk: 'តម្លៃដឹកជញ្ជូនថយចុះខណៈការកកស្ទះនៅកំពង់ផែបានកែលម្អ។', se: 'Global freight rates hit a two-year low as port congestion eases.', i: 'freight-rates' },
  { c: 2, km: 'របាយការណ៍សេរីភាពស៊ីវិលពិភពលោកលើកឡើងពីបញ្ហាប្រឈមថ្មី', en: 'World Press Freedom Report Flags New Challenges', s: 'world-press-freedom-2026', sk: 'អង្គការសង្គមស៊ីវិលលើកឡើងអំពីការគំរាមកំហែងចំពោះអ្នកសារព័ត៌មាន។', se: 'A global press-freedom report flagged new challenges for journalists.', i: 'press-freedom' },
  { c: 2, km: 'សហរដ្ឋអាមេរិក និងឥណ្ឌាពង្រឹងកិច្ចសហប្រតិបត្តិការសេដ្ឋកិច្ចឌីជីថល', en: 'US and India Deepen Digital Economy Partnership', s: 'us-india-digital-ties-2026', sk: 'កិច្ចព្រមព្រៀងថ្មីគ្របដណ្តប់បច្ចេកវិទ្យា ពាណិជ្ជកម្ម និងសន្តិសុខសាយប័រ។', se: 'The US and India deepened cooperation on digital economy and security.', i: 'us-india' },
  { c: 2, km: 'អាស៊ានប្រជុំពង្រឹងយន្តការឆ្លើយតបគ្រោះមហន្តរាយតំបន់', en: 'ASEAN Ministers Boost Regional Disaster Response Mechanism', s: 'asean-disaster-mechanism-2026', sk: 'យន្តការឆ្លើយតបរហ័ស និងការចែករំលែកទិន្នន័យអាកាសធាតុត្រូវពង្រឹង។', se: 'ASEAN ministers agreed to strengthen disaster-response coordination and data sharing.', i: 'asean-disaster' },
  { c: 2, km: 'មូលនិធិវិនិយោគសកលបង្កើនការចាក់ទីផ្សារអាស៊ីប៉ាស៊ីហ្វិក', en: 'Global Funds Lift Allocations to Asia-Pacific Markets', s: 'global-funds-asia-allocation-2026', sk: 'មូលនិធិវិនិយោគអន្តរជាតិបង្កើនការចូលទីផ្សារកំពុងអភិវឌ្ឍន៍។', se: 'Global funds increased allocations to emerging Asia-Pacific markets.', i: 'asia-funds' },
  { c: 2, km: 'បណ្តាប្រទេសប៉ាស៊ីហ្វិកហត្ថលេខាកិច្ចព្រមព្រៀងសន្តិសុខសមុទ្រថ្មី', en: 'Pacific Nations Sign New Maritime Security Pact', s: 'pacific-maritime-pact-2026', sk: 'កិច្ចព្រមព្រៀងតំបន់ថ្មីផ្តោតលើសន្តិសុខសមុទ្រ និងការគ្រប់គ្រង។', se: 'Pacific nations signed a new pact on maritime security and governance.', i: 'pacific-pact' },
  { c: 2, km: 'AI ជួយរកឃើញជំងឺតាំងពីដំណាក់កាលដើមក្នុងការសិក្សាថ្មី', en: 'AI Tools Detect Disease Early in New Clinical Studies', s: 'ai-early-detection-studies-2026', sk: 'ការសិក្សាបង្ហាញពីភាពត្រឹមត្រូវខ្ពស់ក្នុងការរកឃើញជំងឺ។', se: 'AI diagnostic tools showed high accuracy in early disease detection studies.', i: 'ai-health' },
  { c: 2, km: 'ការចរចាសន្តិភាពរវាងភាគីពាក់ព័ន្ធនៅតែបន្តកម្រិតបច្ចេកទេស', en: 'Relevant Parties Continue Technical-Level Peace Talks', s: 'technical-peace-talks-2026', sk: 'ភាគីនឹងជួបគ្នានៅដំណាក់កាលបន្ទាប់។', se: 'Technical-level peace talks between the parties are set to continue.', i: 'peace-talks' },
  { c: 2, km: 'NASA ប្រកាសបេក្ខជនអវកាសយានិកថ្មីសម្រាប់កម្មវិធី Artemis', en: 'NASA Announces New Astronaut Candidates for Artemis', s: 'artemis-astronaut-candidates-2026', sk: 'NASA ប្រកាសបេក្ខជនអវកាសយានិកថ្មីសម្រាប់បេសកកម្មទៅច័ន្ទ។', se: 'NASA announced new astronaut candidates for upcoming Artemis Moon missions.', i: 'artemis-crew' },
  { c: 2, km: 'តម្លៃធ្យូងថ្មពិភពលោកថយ ខណៈវិនិយោគលើថាមពលព្រះអាទិត្យកើនឡើង', en: 'Coal Prices Fall as Solar Investment Surges Worldwide', s: 'coal-solar-price-shift-2026', sk: 'ទិន្នន័យទីផ្សារបង្ហាញពីការផ្លាស់ប្តូរទៅរកថាមពលកកើតឡើងវិញ។', se: 'Coal prices slid as solar investment surged worldwide.', i: 'solar-surge' },
  { c: 2, km: 'សន្និសីទតំបន់ស្តីពីបច្ចេកវិទ្យាប្រព្រឹត្តិទឹកសម្រាប់តំបន់ខ្វះខាត', en: 'Regional Summit on Desalination Tech for Water-Scare Areas', s: 'desalination-regional-summit-2026', sk: 'អ្នកជំនាញចែករំលែកដំណោះស្រាយបច្ចេកវិទ្យាសម្រាប់ការខ្វះខាតទឹក។', se: 'Specialists shared desalination and water-saving technologies at a regional summit.', i: 'water-summit' },
  { c: 2, km: 'ចំនួនភ្ញៀវទេសចរអន្តរជាតិត្រឡប់ដល់កម្រិតមុនរាតត្បាតវិញ', en: 'Global Tourism Returns to Pre-Pandemic Levels', s: 'global-tourism-recovery-2026', sk: 'UN Tourism ប្រកាសថាចំនួនភ្ញៀវអន្តរជាតិស្មើកម្រិតឆ្នាំ ២០១៩។', se: 'International tourist arrivals have returned to pre-pandemic levels, UN Tourism said.', i: 'tourism-global' },
  { c: 2, km: 'ការប្រកួតប្រជែងផលិតឈីបជំនាន់ ២ ណាណូម៉ែត្ររវាងក្រុមហ៊ុនធំៗ', en: 'Chipmakers Race Toward 2nm Fabrication Milestones', s: 'chip-2nm-race-2026', sk: 'ផលិតកម្មជំនាន់ថ្មីត្រៀមចេញផលិតផលពាណិជ្ជកម្ម។', se: 'Rival chipmakers unveiled next-generation 2nm fabrication milestones.', i: 'chip-race' },
  { c: 2, km: 'របាយការណ៍សន្តិសុខអាហារពិភពលោកព្រមានពីតំបន់ប្រឈម', en: 'Global Food Security Report Warns of Hunger Hotspots', s: 'food-security-hotspots-2026', sk: 'អង្គការអន្តរជាតិជំរុញផែនការជួយសហគមន៍ទទួលរង។', se: 'The global food-security report warned of persistent hunger hotspots.', i: 'food-security' },
  { c: 2, km: 'បណ្តាប្រទេសនាំចេញគ្រាប់ធញ្ញជាតិបង្កើតសម្ព័ន្ធភាពទំនិញ', en: 'Grain Exporters Form Alliance on Pricing and Standards', s: 'grain-export-alliance-2026', sk: 'កិច្ចព្រមព្រៀងផ្លាស់ប្តូរព័ត៌មាន និងស្តង់ដាររួម។', se: 'Grain-exporting nations formed an alliance on pricing and shared standards.', i: 'grain-alliance' },
  { c: 2, km: 'អ្នកស្រាវជ្រាវបង្ហាញវិធីផលិតស៊ីម៉ងត៍កាបូនទាប', en: 'Researchers Demonstrate Low-Carbon Cement Process', s: 'low-carbon-cement-breakthrough-2026', sk: 'បច្ចេកវិទ្យាថ្មីអាចកាត់បន្ថយការបញ្ចេញកាបូនពីឧស្សាហកម្មសំណង់។', se: 'Researchers demonstrated a low-carbon cement process for the construction industry.', i: 'green-cement' },
  { c: 2, km: 'របាយការណ៍៖ ព្រហ្មកម្មសមុទ្រនៅទឹកនាំអាស៊ីថយចុះ', en: 'Report: Piracy Incidents Decline in Asian Waters', s: 'piracy-decline-asia-2026', sk: 'មជ្ឈមណ្ឌលចែករំលែកព័ត៌មានរាយការណ៍ពីការថយចុះនៃហេតុការណ៍។', se: 'Regional co-operation reported a decline in maritime piracy incidents in Asian waters.', i: 'recaap-report' },
  { c: 2, km: 'WTO ពិភាក្សាយន្តការពន្ធកាបូនតាមព្រំដែន', en: 'WTO Debates Carbon Border Adjustment Mechanisms', s: 'wto-carbon-border-talks-2026', sk: 'បណ្តាប្រទេសពិភាក្សាអំពីបទដ្ឋានពាណិជ្ជកម្មកាបូន។', se: 'The WTO debated carbon border adjustment mechanisms at an international policy session.', i: 'carbon-trade' },
  { c: 2, km: 'ទីក្រុងធំៗនៅអាមេរិកឡាទីនចាប់ផ្តើមគម្រោងមេត្រូថ្មី', en: 'Latin American Cities Break Ground on New Metro Lines', s: 'latam-metro-groundbreaking-2026', sk: 'គម្រោងមេត្រូថ្មីៗផ្តោតលើថាមពលស្អាត។', se: 'Major Latin American cities broke ground on new metro expansion lines.', i: 'latam-metro' },
  { c: 2, km: 'បណ្តាញ 5G Advanced ចាប់ផ្តើមដំណើរការនៅទ្វីបអឺរ៉ុប', en: '5G-Advanced Networks Begin Rolling Out Across Europe', s: '5g-advanced-europe-launch-2026', sk: 'បណ្តាញជំនាន់ក្រោយនឹងលឿនជាងមុន និងប្រើថាមពលតិចជាង។', se: 'Telecom operators began rolling out 5G-Advanced services across Europe.', i: '5g-advanced' },
  { c: 2, km: 'យុទ្ធនាការសម្អាតសមុទ្រសកលប្រមូលប្លាស្ទិកបាន ២០,០០០ តោន', en: 'Global Ocean Cleanup Recovers 20,000 Tonnes of Plastic', s: 'ocean-cleanup-20k-tonnes-2026', sk: 'គម្រោងសាកលដឹកនាំដោយបណ្តាប្រទេសក្នុងតំបន់អាស៊ី។', se: 'A global ocean cleanup drive recovered 20,000 tonnes of plastic waste.', i: 'ocean-cleanup' },
  { c: 2, km: 'សេដ្ឋកិច្ចឌីជីថលអាហ្វ្រិកបង្ហាញកំណើនខ្លាំង', en: 'Africa\'s Digital Economy Posts Robust Growth', s: 'africa-digital-economy-growth-2026', sk: 'សេវាហិរញ្ញវត្ថុឌីជីថលនៅអាហ្វ្រិករីកចម្រើនខ្លាំង។', se: 'Africa\'s digital economy posted robust growth led by fintech services.', i: 'africa-digital' },
  { c: 2, km: 'សន្និសីទអវកាស៖ ផែនការស្រាវជ្រាវភពអង្គារថ្មី', en: 'Space Congress Unveils New Mars Exploration Roadmaps', s: 'mars-exploration-roadmaps-2026', sk: 'បេសកកម្មថ្មីៗត្រៀមស្វែងយល់ពីលក្ខខណ្ឌលើភពផ្សេង។', se: 'The international space congress unveiled new Mars exploration roadmaps.', i: 'mars-plans' },

  // ============ CATEGORY 3: SPORTS (20) ============
  { c: 3, km: 'ជម្រើសជាតិកម្ពុជាត្រៀមខ្លួនសម្រាប់ការប្រកួតជ្រែកជើង AFF', en: 'Cambodia National Team Prepares for AFF Qualifiers', s: 'nct-aff-qualifiers-camp-2026', sk: 'គ្រូបង្វឹកបានហៅកីឡាករ ២៧ នាក់ចូលវគ្គប្រមូលផ្តុំ។', se: 'The national team called up 27 players for the AFF championship camp.', i: 'aff-prep' },
  { c: 3, km: 'ការប្រណាំងទម្លាក់ស្ពានប្រចាំឆ្នាំទាក់ទាញអ្នករត់ជាង ១០,០០០ នាក់', en: 'Annual Bridge Run Attracts Over 10,000 Runners', s: 'phnom-penh-bridge-run-2026', sk: 'ព្រឹត្តិការណ៍រត់អន្តរជាតិវិលត្រឡប់មកវិញដោយជោគជ័យ។', se: 'The annual bridge run attracted over 10,000 runners from the region.', i: 'bridge-run' },
  { c: 3, km: 'កីឡាការិនីកុនខ្មែរឈ្នះគ្រីស្តាល់ប្រាក់នៅស៊ីហ្គេម', en: 'Khmer Kun Boxer Clinches Silver at SEA Games', s: 'kun-boxing-sea-games-silver-2026', sk: 'សមត្ថភាពរបស់កីឡាករខ្មែរបន្តបង្ហាញខ្លាំងនៅក្នុងតំបន់។', se: 'A Khmer kun boxer clinched silver at the SEA Games.', i: 'sea-games-kun' },
  { c: 3, km: 'សហព័ន្ធប៉េតង់ប្រកាសកាលវិភាគជើងឯកតំបន់', en: 'Pétanque Federation Announces Regional Championship Schedule', s: 'petanque-regional-champs-2026', sk: 'ការប្រកួតនឹងទាក់ទាញក្រុមពីបណ្តាប្រទេសអាស៊ាន។', se: 'The petanque federation announced the regional championship schedule.', i: 'petanque-cup' },
  { c: 3, km: 'ក្រុមបាល់ទះយុវជនកម្ពុជាឡើងដល់វគ្គផ្តាច់ព្រ័ត្រជើងឯកអាស៊ី', en: 'Youth Volleyball Team Reaches Asian Finals', s: 'youth-volleyball-asian-finals-2026', sk: 'ទេសភាពរបស់ក្រុមយុវជនបានធ្វើឱ្យអ្នកគាំទ្រខ្មែររំភើប។', se: 'Cambodia\'s youth volleyball side reached the Asian finals.', i: 'volleyball-finals' },
  { c: 3, km: 'សហព័ន្ធជលកាយដាក់ផែនការអភិវឌ្ឍកីឡាទូក', en: 'Canoe Federation Unveils Paddling Development Plan', s: 'canoe-development-plan-2026', sk: 'ការហ្វឹកហាត់ទូកប្រណាំងត្រៀមសម្រាប់កីឡាអាស៊ី។', se: 'The canoe federation unveiled a development plan ahead of the Asian Games.', i: 'canoe-plan' },
  { c: 3, km: 'លីគកំពូលកម្ពុជា៖ ក្រុមថ្មីៗបង្កើនការប្រកួតប្រជែង', en: 'Cambodian Premier League Grows More Competitive', s: 'cpl-competitiveness-rise-2026', sk: 'លីគកំពូលកម្ពុជានៅតែទាក់ទាញអ្នកគាំទ្រកាន់តែច្រើន។', se: 'The Cambodian Premier League drew bigger crowds as new clubs raised competitiveness.', i: 'cpl-season' },
  { c: 3, km: 'ក្រុម eSport ខ្មែរឈ្នះពានរង្វាន់អាស៊ីអាគ្ណេយ៍', en: 'Khmer Esports Squad Wins Southeast Asian Title', s: 'khmer-esports-sea-title-2026', sk: 'ក្រុម MOBA ខ្មែរក្លាហាននៅការប្រកួតតំបន់។', se: 'Khmer esports squad won the Southeast Asian championship title.', i: 'esports-title' },
  { c: 3, km: 'ព្រឹត្តិការណ៍ Aquabike ទាក់ទាញអ្នកចូលរួមជាង ៥០០ នាក់', en: 'Aquabike Event Draws More Than 500 Participants', s: 'aquabike-sports-tourism-2026', sk: 'ព្រឹត្តិការណ៍កីឡាទឹករួមគ្នាជាមួយទេសចរណ៍។', se: 'Over 500 participants joined the aquabike sports-tourism event.', i: 'aquabike-event' },
  { c: 3, km: 'សហព័ន្ធទះយោធាចាប់ផ្តើមគម្រោងស្វែងរកកីឡាករវ័យក្មេង', en: 'Boxing Federation Launches Youth Talent Scouting', s: 'boxing-youth-scouting-2026', sk: 'គម្រោងស្វែងរកកីឡាករវ័យក្មេងទូទាំងប្រទេស។', se: 'The boxing federation launched a nationwide talent-scouting programme.', i: 'boxing-scout' },
  { c: 3, km: 'ជើងឯកកាយ៉ាក់អន្តរជាតិបិទបញ្ចប់នៅកែបដោយជោគជ័យ', en: 'International Kayak Championships Close Successfully in Kep', s: 'kep-kayak-champs-2026', sk: 'ក្រុមពីប្រទេសជាង ១០ ចូលរួម។', se: 'The world kayak championships concluded successfully in Kep with 10+ nations.', i: 'kayak-world' },
  { c: 3, km: 'សាលាបាល់បោះវ័យក្មេងថ្មីបើកនៅរាជធានី', en: 'New Youth Basketball Academy Opens in Capital', s: 'basketball-youth-academy-2026', sk: 'សាលាវ័យក្មេងគ្របដណ្តប់ ៥០០ សិស្ស។', se: 'A new basketball youth academy opened in the capital with 500 enrolments.', i: 'basketball-academy' },
  { c: 3, km: 'កីឡាករវ័យក្មេងកម្ពុជាឈ្នះមេដាយមាសដំបូងនៅជើងឯកអាស៊ី', en: 'Young Cambodian Claims First Asian Youth Gold', s: 'first-asian-youth-gold-2026', sk: 'សមិទ្ធផលប្រវត្តិសាស្ត្រសម្រាប់កីឡាខ្មែរ។', se: 'A Cambodian youth athlete bagged the country\'s first Asian youth gold.', i: 'youth-gold' },
  { c: 3, km: 'ព្រឹត្តិការណ៍រត់សប្បុរសធម៌រៃអង្គាសប្រាក់ជូនកុមារកំព្រា', en: 'Charity Fun Run Raises Funds for Orphanages', s: 'charity-fun-run-orphans-2026', sk: 'អ្នកចូលរួមរៀបចំកម្មវិធីរៃអង្គាសបរិច្ចាគ។', se: 'A charity fun-run raised funds for orphanages across the country.', i: 'charity-run' },
  { c: 3, km: 'ការប្រកួតវាយតេនីសជាតិ៖ កីឡាករវ័យក្មេងលេចមុខ', en: 'National Tennis Championship Sees Young Talent Emerge', s: 'national-tennis-champs-2026', sk: 'ជើងឯកថ្មីលេចមុខនៅការប្រកួតតេនីសជាតិ។', se: 'Young talents emerged champions at the national tennis tournament.', i: 'tennis-national' },
  { c: 3, km: 'សហព័ន្ធស្នូកចុះកិច្ចសហប្រតិបត្តិការជាមួយសហព័ន្ធអន្តរជាតិ', en: 'Snooker Federation Signs Deal with World Body', s: 'snooker-world-federation-deal-2026', sk: 'កិច្ចព្រមព្រៀងផ្តល់ឱកាសបណ្តុះបណ្តាលគ្រូ។', se: 'A cooperation deal with the world snooker body will fund coach training.', i: 'snooker-deal' },
  { c: 3, km: 'ក្រុមសាលាអន្តរជាតិឈ្នះពានបាល់ទាត់សាលាជាតិ', en: 'International School Team Lifts National Schools Trophy', s: 'national-schools-football-cup-2026', sk: 'ការប្រកួតបាល់ទាត់សាលាបញ្ចប់ដោយជោគជ័យ។', se: 'The international school team lifted the national schools football trophy.', i: 'schools-cup' },
  { c: 3, km: 'កីឡាករពិការចាប់ផ្តើមវគ្គត្រៀមសម្រាប់ ASEAN Para Games', en: 'Para-Athletes Begin Preparation for ASEAN Para Games', s: 'asean-para-games-camp-2026', sk: 'ការជ្រើសរើសកីឡាករពិការជាតិកំពុងបន្ត។', se: 'Para-athletes began their preparation camps for the ASEAN Para Games.', i: 'para-games' },
  { c: 3, km: 'ក្លិបលីគពង្រឹងខ្សែការពារដោយកីឡាករបរទេសមុនរដូវកាល', en: 'League Clubs Add Foreign Defenders Before Season Kickoff', s: 'cpl-defensive-signings-2026', sk: 'ការដោះដូរកីឡាករនៅតាមក្លិបលីគកំពូល។', se: 'CL clubs strengthened defensive lines with foreign signings before kickoff.', i: 'transfer-window' },
  { c: 3, km: 'សហព័ន្ធជលកាយប្រគល់រង្វាន់កិត្តិយសជូនកីឡាករចូលនិវត្តន៍', en: 'Canoe Federation Honours Retiring Athletes', s: 'canoe-retirement-honours-2026', sk: 'ពិធីគោរពកីឡាករជួរមុខបានប្រព្រឹត្តទៅ។', se: 'The canoe federation honoured retiring athletes with commemorative awards.', i: 'canoe-honour' },

  // ============ CATEGORY 4: TECHNOLOGY (20) ============
  { c: 4, km: 'វេទិកា E-commerce កម្ពុជាបើកសេវាបើកហាងឌីជីថលសម្រាប់ SME', en: 'Local E-commerce Platform Launches One-Hour Digital Storefronts for SMEs', s: 'sme-digital-storefronts-2026', sk: 'ក្រុមហ៊ុនតូចៗអាចបើកហាងអនឡាញបានក្នុងពេលតែមួយម៉ោង។', se: 'A local e-commerce platform launched one-hour digital storefronts for SMEs.', i: 'sme-platform' },
  { c: 4, km: 'Fintech៖ ការតភ្ជាប់បង់ថ្លៃ QR ឆ្លងដែនគ្របដណ្តប់ពេញអាស៊ាន', en: 'Cross-Border QR Payment Linkages Now Span All of ASEAN', s: 'asean-qr-linkage-complete-2026', sk: 'ការតភ្ជាប់ប្រតិបត្តិការឆ្លងដែនតាម QR ពង្រីកទៅបណ្តាប្រទេស។', se: 'Cross-border QR payment linkages now span the entire ASEAN region.', i: 'qr-crossborder' },
  { c: 4, km: 'សិស្សខ្មែរឈ្នះការប្រកួតបង្កើតកម្មវិធីបច្ចេកវិទ្យាអាកាសធាតុ', en: 'Khmer Students Win Climate-Tech App Challenge', s: 'climate-tech-app-winners-2026', sk: 'ក្រុមសិស្សបានបង្កើតកម្មវិធីត្រួតពិនិត្យគុណភាពខ្យល់។', se: 'Khmer students won a climate-tech app challenge with an air-quality monitor.', i: 'app-challenge' },
  { c: 4, km: 'រ៉ូបូតស្វ័យប្រវត្តិសាកល្បងដាំស្រូវនៅបាត់ដំបង', en: 'Autonomous Rice-Farming Robots Trialled in Battambang', s: 'rice-farming-robots-trial-2026', sk: 'យានអាកាសគ្រប់គ្រងស្រូវជំនាន់ថ្មីបានសាកល្បង។', se: 'Autonomous rice-farming robots were trialled in Battambang fields.', i: 'agri-robots' },
  { c: 4, km: 'វិស័យមជ្ឈមណ្ឌលទិន្នន័យកម្ពុជាទាក់ទាញវិនិយោគិនថ្មី', en: 'Cambodia Data Centre Sector Attracts New Investors', s: 'data-centre-investment-kh-2026', sk: 'គម្រោងមជ្ឈមណ្ឌលទិន្នន័យថ្មីរួមនឹងថាមពលសូឡា។', se: 'New data-centre projects with solar power attracted fresh investors.', i: 'datacenter-kh' },
  { c: 4, km: 'របាយការណ៍៖ អ្នកប្រើអ៊ីនធឺណិតកម្ពុជាឈានដល់ ៧០% នៃប្រជាជន', en: 'Internet Penetration in Cambodia Climbs Past 70%', s: 'internet-penetration-70pc-2026', sk: 'របាយការណ៍ថ្មីបង្ហាញពីកំណើនអ្នកប្រើប្រាស់អ៊ីនធឺណិត។', se: 'Internet penetration climbed past 70% of the population, a new report shows.', i: 'internet-growth' },
  { c: 4, km: 'ស្តាតអាប់ឡូជីស្ទិកខ្មែរបិទការប្រមូលមូលនិធិ Series A ២ លានដុល្លារ', en: 'Khmer Logistics Start-Up Closes $2M Series A Round', s: 'logistics-startup-series-a-2026', sk: 'ក្រុមហ៊ុន logtech ខ្មែរបានបិទការប្រមូលមូលនិធិជោគជ័យ។', se: 'A Khmer logistics start-up closed a $2 million Series A round.', i: 'startup-funding' },
  { c: 4, km: 'កម្មវិធី «សិស្សសរសេរកម្មវិធី» បណ្តុះសិស្ស ១០,០០០ នាក់លើ coding', en: 'Students Code Initiative Teaches 10,000 Kids Programming', s: 'students-code-10000-2026', sk: 'កម្មវិធីពង្រីកទៅខេត្ត ២៥ ក្នុងឆ្នាំនេះ។', se: 'The «Students Code» initiative expanded to 25 provinces, training 10,000 pupils.', i: 'coding-kids' },
  { c: 4, km: 'មជ្ឈមណ្ឌលឆ្លើយតបសុវត្ថិភាពសាយប័រជាតិថ្មីដាក់ឱ្យប្រើប្រាស់', en: 'National Cyber-Response Centre Goes Live', s: 'national-cyber-centre-2026', sk: 'មជ្ឈមណ្ឌលថ្មីត្រៀមឆ្លើយតបព្រឹត្តិការណ៍សុវត្ថិភាពព័ត៌មាន។', se: 'A new national cyber-response centre was inaugurated to handle incidents.', i: 'soc-launch' },
  { c: 4, km: 'សាកល្បងសេវាព្យាបាលពីចម្ងាយលើបណ្តាញ 5G នៅមន្ទីរពេទ្យខេត្ត', en: '5G Telemedicine Pilots Launch in Provincial Hospitals', s: '5g-telemedicine-pilot-2026', sk: 'គ្រូពេទ្យអាចព្យាបាលពីចម្ងាយក្នុងពេលជាក់ស្តែង។', se: '5G pilots enabled real-time telemedicine consultations in rural hospitals.', i: 'telemedicine-5g' },
  { c: 4, km: 'ចំណុចសាករថយន្តអគ្គិសនីជាង ១០០ ត្រូវដំឡើងជុំវិញរាជធានី', en: 'Over 100 EV Fast-Charging Points Installed Around Capital', s: 'ev-charging-network-pp-2026', sk: 'បណ្តាញសេវាសាកថ្មរហ័សពង្រីកសម្រាប់រថយន្តអគ្គិសនី។', se: 'Over 100 new fast-charging points were installed around the capital.', i: 'ev-charging' },
  { c: 4, km: 'វិស្វករខ្មែរបញ្ចេញម៉ូដែល AI ភាសាខ្មែរឥតគិតថ្លៃ', en: 'Engineers Release Free Khmer-Language AI Model', s: 'khmer-ai-model-release-2026', sk: 'ម៉ូដែល AI យល់ និងបកប្រែភាសាខ្មែរកាន់តែប្រសើរ។', se: 'Khmer engineers released a free Khmer-language AI model with better translation.', i: 'khmer-ai' },
  { c: 4, km: 'សិល្បករឌីជីថលខ្មែរបង្ហាញស្នាដៃនៅផ្សារ NFT សាកល', en: 'Khmer Digital Artists Gain Visibility in Global NFT Markets', s: 'khmer-nft-artists-2026', sk: 'សិល្បករខ្មែរបង្ហាញស្នាដៃនៅទីផ្សារសិល្ប៍ឌីជីថល។', se: 'Khmer digital artists gained visibility in global NFT marketplaces.', i: 'nft-art' },
  { c: 4, km: 'គម្រោងអ៊ីនធឺណិតផ្កាយរណបគម្របសហគមន៍ទីឆ្ងាយ', en: 'Satellite Broadband Project Targets Remote Communities', s: 'satellite-broadband-rural-2026', sk: 'គម្រោងប្រព័ន្ធឨីនធឺណិតតាមផ្កាយរណបសម្រាប់តំបន់គ្មានបណ្តាញសរសៃអុបទិក។', se: 'A satellite broadband project targets remote communities lacking fibre.', i: 'sat-broadband' },
  { c: 4, km: 'ការប្រកួតរ៉ូបូតជាតិ៖ ក្រុមសិស្សវិទ្យាល័យជាង ១០០ ចូលរួម', en: 'Over 100 School Teams Join National Robotics Competition', s: 'national-robotics-competition-2026', sk: 'ការប្រកួតរ៉ូបូតប្រចាំឆ្នាំលើកទឹកចិត្ត STEM។', se: 'Over 100 school teams joined the national robotics STEM competition.', i: 'robotics-comp' },
  { c: 4, km: 'របាយការណ៍តំបន់៖ ការយល់ដឹងអំពី Cryptocurrency កើនឡើងក្នុងក្រុមវ័យក្មេង', en: 'Regional Report: Crypto Awareness Rises Among Young Savers', s: 'crypto-awareness-report-2026', sk: 'អ្នកជំនាញណែនាំពីការប្រុងប្រយ័ត្នក្នុងការវិនិយោគ។', se: 'A regional report showed rising crypto awareness among young savers.', i: 'crypto-aware' },
  { c: 4, km: 'ដ្រូនពិនិត្យដំណាំកសិកម្មត្រូវបានប្រើកាន់តែច្រើន', en: 'Commercial Farmers Adopt Drone Crop Scouting', s: 'drone-crop-scouting-2026', sk: 'កសិករធំៗចាប់ផ្តើមប្រើដ្រូនពិនិត្យស្រូវ និងដំណាំផ្សេង។', se: 'Commercial farmers adopted drone crop-scouting across key growing regions.', i: 'drone-farm' },
  { c: 4, km: 'កម្មវិធីអត្តសញ្ញាណឌីជីថលថ្មីភ្ជាប់ជាមួយសេវារដ្ឋ', en: 'Digital-ID App Unlocks Dozens of Public Services', s: 'digital-id-public-services-2026', sk: 'ពលរដ្ឋអាចប្រើប្រាស់អត្តសញ្ញាណឌីជីថលសម្រាប់សេវារដ្ឋ។', se: 'The new digital-ID app unlocks access to dozens of public services.', i: 'digital-id' },
  { c: 4, km: 'EdTech កម្ពុជាបន្ថែមវគ្គសិក្សាឥតគិតថ្លៃជាភាសាខ្មែរ', en: 'Local EdTech Platform Adds Hundreds of Free Khmer Courses', s: 'edtech-free-khmer-courses-2026', sk: 'វេទិកាថ្មីផ្តល់វគ្គសិក្សាឥតគិតថ្លៃជាភាសាខ្មែរ។', se: 'A local EdTech platform added hundreds of free Khmer-language courses.', i: 'edtech-kh' },
  { c: 4, km: 'សួនបច្ចេកវិទ្យាថ្មីនៅកណ្តាលផ្តល់កន្លែងធ្វើការដល់ក្រុមហ៊ុន IT ៥០', en: 'New Kandal Tech Park to House 50 IT and BPO Firms', s: 'kandal-tech-park-opening-2026', sk: 'សួនឧស្សាហកម្មបច្ចេកវិទ្យាទាក់ទាញក្រុម IT និង BPO។', se: 'The new tech park in Kandal will house 50 technology and BPO firms.', i: 'tech-park' },

  // ============ CATEGORY 5: ECONOMY (20) ============
  { c: 5, km: 'ធនាគារជាតិនៅតែរក្សាអត្រាការប្រាក់គោលនៅកម្រិតស្ថិរភាព', en: 'National Bank of Cambodia Holds Policy Rate Steady', s: 'nbc-policy-rate-held-2026', sk: 'NBC សម្រេចរក្សាអត្រាការប្រាក់គោលខណៈអតិផរណានឹងស្ថិរភាព។', se: 'The National Bank of Cambodia kept its policy rate steady amid calm inflation.', i: 'nbc-rate' },
  { c: 5, km: 'ការនាំចេញផលិតកម្មកសិកម្មកើន ១៥% នៅត្រីមាសនេះ', en: 'Agri-Processing Exports Grow 15% This Quarter', s: 'agri-exports-up-15pc-2026', sk: 'ទិន្នន័យក្រសួងពាណិជ្ជកម្មបង្ហាញពីកំណើនកសិ-ឧស្សាហកម្ម។', se: 'Agri-exports grew 15% this quarter, customs data showed.', i: 'agri-export' },
  { c: 5, km: 'ក្រុមហ៊ុនខ្មែរប្រើអត្ថប្រយោជន៍ EVFTA ចូលទីផ្សារអឺរ៉ុបកាន់តែច្រើន', en: 'More Cambodian Firms Leverage EVFTA for EU Market Access', s: 'evfta-market-access-2026', sk: 'ការប្រើប្រាស់ប្រភពដើមសម្រាប់ពន្ធគយទម្លាក់ការនាំចូលបន្តកើន។', se: 'More Cambodian firms leveraged the EU trade pact to access European buyers.', i: 'evfta-use' },
  { c: 5, km: 'គណនី Mobile Banking កំពូលថ្មីខណៈការបង់ប្រាក់ឌីជីថលរីក', en: 'Mobile Banking Accounts Hit Record High', s: 'mobile-banking-record-2026', sk: 'ការប្រើប្រាស់ការបង់ប្រាក់តាមទូរសព្ទកើនឡើងខ្លាំង។', se: 'Mobile-banking accounts reached a record high as digital payments surged.', i: 'mbanking-growth' },
  { c: 5, km: 'ម៉ាកកាហ្វេខ្មែរពិសេសរីកចម្រើននៅទីផ្សារអាស៊ី', en: 'Premium Khmer Coffee Brands Expand Across Asia', s: 'khmer-coffee-asia-expansion-2026', sk: 'ម៉ាកកាហ្វេកំពូលពង្រីកការនាំចេញទៀត។', se: 'Premium Khmer coffee brands expanded into Asian specialty markets.', i: 'coffee-export' },
  { c: 5, km: 'កញ្ចប់ឥណទានថ្មីបន្ថយការប្រាក់សម្រាប់សហគ្រាសធុនតូច', en: 'New Credit Facility Cuts Borrowing Costs for Small Firms', s: 'sme-credit-facility-2026', sk: 'កញ្ចប់ឥណទានថ្មីសម្រាប់សហគ្រាសធុនតូច និងមធ្យម។', se: 'A new credit facility lowered borrowing costs for small enterprises.', i: 'sme-credit' },
  { c: 5, km: 'ទេសចរណ៍រួមចំណែក GDP ខ្ពស់បំផុតថ្មីតាមរបាយការណ៍', en: 'Tourism\'s GDP Contribution Reaches Record Share', s: 'tourism-gdp-record-share-2026', sk: 'វិស័យទេសចរណ៍រួមចំណែកក្នុង GDP កាន់តែខ្ពស់។', se: 'Tourism\'s contribution to GDP hit a record share, statistics institute said.', i: 'tourism-gdp' },
  { c: 5, km: 'រោងចក្រចម្រាញ់ទឹកក្នុងព្រះសីហនុបើកដំណើរការជំហានដំបូង', en: 'Sihanoukville Bottling Plant Begins First Operations', s: 'bottling-plant-sihanoukville-2026', sk: 'រោងចក្រចម្រាញ់ទឹកទំនើបបម្រើតម្រូវការក្នុងស្រុក។', se: 'The Sihanouville bottling plant began operations to serve domestic demand.', i: 'bottling-plant' },
  { c: 5, km: 'គម្រោងផលិតភពព្រះអាទិត្យ ២០០ មេកាវ៉ាត់ត្រូវអនុម័ត', en: '200-Megawatt Solar Project Wins Final Approval', s: 'solar-200mw-approved-2026', sk: 'ការវិនិយោគថាមពលកកើតឡើងវិញបន្តរីកចម្រើន។', se: 'A 200-megawatt solar project won final approval from energy regulators.', i: 'solar-200mw' },
  { c: 5, km: 'ទីផ្សារភាគហ៊ុន៖ តម្លៃភាគហ៊ុនកើនតាមការទុកចិត្តសេដ្ឋកិច្ច', en: 'Listed Equities Gain on Renewed Economic Confidence', s: 'stock-market-confidence-2026', sk: 'សន្ទស្សន៍ទីផ្សារមានចលនាវិជ្ជមានតាមទិសដៅសេដ្ឋកិច្ច។', se: 'Listed equities gained on renewed investor confidence in the economy.', i: 'stock-move' },
  { c: 5, km: 'ប្រាក់បញ្ញើនៅស្ថាប័នហិរញ្ញវត្ថុមីក្រូធនាគារកើនឡើង', en: 'Microfinance Deposits Grow Steadily This Year', s: 'microfinance-deposit-growth-2026', sk: 'មូលនិធិសន្សំរបស់ប្រជាពលរដ្ឋកើនឡើងជាលំដាប់។', se: 'Deposits at licensed microfinance institutions grew steadily this year.', i: 'mfi-deposits' },
  { c: 5, km: 'បរិមាណដឹកជញ្ជូនទំនិញតាមផ្លូវរថភ្លើងកើន ៣០%', en: 'Rail Freight Volumes Rise 30% on Intermodal Gains', s: 'rail-freight-up-30pc-2026', sk: 'សេវារថភ្លើងដឹកទំនិញរវាងក្រុង និងតំបន់កើនឡើង។', se: 'Rail freight volumes rose 30% as intermodal services expanded.', i: 'rail-freight' },
  { c: 5, km: 'ទំនិញប្រើប្រាស់ក្នុងស្រុកចូលទីផ្សារវៀតណាម និងថៃកាន់តែច្រើន', en: 'Local Consumer Goods Gain Share in Vietnamese and Thai Markets', s: 'border-trade-vn-th-2026', sk: 'ផលិតផលក្នុងស្រុកចូលទីផ្សារអ្នកជិតខាងកាន់តែច្រើន។', se: 'Local consumer products gained shelf space in Vietnamese and Thai markets.', i: 'border-trade' },
  { c: 5, km: 'គម្រោងខុនដូថ្មីៗបើកការលក់នៅរាជធានី', en: 'New Condominium Projects Launch Sales in Capital', s: 'condo-sales-launch-pp-2026', sk: 'ការបើកលក់ផ្ទះក្នុងខុនដូថ្មីនៅតំបន់រីកចម្រើន។', se: 'New condominium projects launched sales in the expanding corridor districts.', i: 'condo-launch' },
  { c: 5, km: 'រោងចក្រកាត់ដេរបង្កើនការផលិតសម្រាប់ការបញ្ជាទិញចុងឆ្នាំ', en: 'Garment Factories Ramp Up for Year-End Orders', s: 'garment-year-end-orders-2026', sk: 'រោងចក្រប្រកាសជួលកម្មករបន្ថែម។', se: 'Garment factories ramped up output and hired extra workers for year-end orders.', i: 'garment-orders' },
  { c: 5, km: 'តំបន់សេដ្ឋកិច្ចពិសេសថ្មីនៅតាកែវរំពឹងបង្កើតការងារ ១០,០០០', en: 'New Takeo Special Economic Zone to Create 10,000 Jobs', s: 'takeo-sez-jobs-2026', sk: 'តំបន់ឧស្សាហកម្មថ្មីរំពឹងផ្តល់ការងារ ១០,០០០។', se: 'A new special economic zone in Takeo is projected to create 10,000 jobs.', i: 'takeo-sez' },
  { c: 5, km: 'សន្ទស្សន៍ធ្វើអាជីវកិច្ច៖ កម្ពុជាល្អប្រសើរលើការចាប់ផ្តើមអាជីវកម្ម', en: 'Business Indicators Improve on Startup Registration Times', s: 'startup-business-indicators-2026', sk: 'ពេលវេលាចុះឈ្មោះអាជីវកម្មថយចុះ។', se: 'Business-startup indicators improved as registration times shrank.', i: 'biz-ranking' },
  { c: 5, km: 'គម្រោងពង្រីកបណ្តាញអគ្គិសនីដល់ភូមិឃុំជនបទបន្ថែម', en: 'Grid Extension Programme Reaches More Rural Communes', s: 'rural-grid-extension-2026', sk: 'បណ្តាញចែកចាយអគ្គិសនីគ្របដណ្តប់ទៅសហគមន៍ថ្មី។', se: 'Grid-extension programmes brought electricity to more rural communes.', i: 'grid-expand' },
  { c: 5, km: 'ទីផ្សារការងារ៖ តម្រូវការជំនាញ IT កើន ៤០%', en: 'Demand for IT Skills Jumps 40% Across Employers', s: 'it-jobs-demand-40pc-2026', sk: 'ក្រុមហ៊ុនរកបុគ្គលិក dev និង data កាន់តែច្រើន។', se: 'Demand for IT skills jumped 40% as firms chased developers and data talent.', i: 'job-it-demand' },
  { c: 5, km: 'ការធ្វើធានារ៉ាប់រងសុខភាពគ្រួសាររីកចម្រើនខ្លាំង', en: 'Family Health-Insurance Uptake Rises Sharply', s: 'family-insurance-uptake-2026', sk: 'ការធ្វើធានារ៉ាប់រងសុខភាពក្រុមគ្រួសាររីកចម្រើន។', se: 'Family health-insurance uptake rose sharply across urban provinces.', i: 'insurance-fam' }
];

const AUTHORS = ['Khmer News Desk', 'Phnom Penh Bureau', 'International Desk', 'Sports Desk', 'Tech Desk', 'Economy Desk'];
const TEMPLATES = ['standard', 'wide', 'horizontal', 'minimal', 'highlight'];

const TAGS_BY_CAT = {
  1: ['government', 'environment', 'education', 'health', 'culture', 'climate'],
  2: ['asean', 'climate', 'economy', 'government'],
  3: ['sports', 'culture'],
  4: ['technology', 'economy', 'education'],
  5: ['economy', 'technology', 'environment']
};

function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261104);

function makeContent(catId, summaryKm, summaryEn) {
  const pool = BODY[catId];
  const a = pick(pool, rng);
  let b = pick(pool, rng);
  if (b === a) b = pool[(pool.indexOf(a) + 1) % pool.length];
  return {
    km: `<p>${summaryKm}</p>` + a[0] + b[0],
    en: `<p>${summaryEn}</p>` + a[1] + b[1]
  };
}

function fmtDate(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

db.serialize(() => {
  db.all('SELECT id, slug FROM tags', [], (err, tagRows) => {
    const tagBySlug = {};
    (tagRows || []).forEach((t) => { tagBySlug[t.slug] = t.id; });

    let done = 0, inserted = 0, skipped = 0;
    const total = ARTICLES.length;

    ARTICLES.forEach((a, idx) => {
      const content = makeContent(a.c, a.sk, a.se);
      // Spread created_at over the last ~40 days; earlier array entries are newer
      const hoursAgo = Math.floor(idx * 7 + rng() * 6);
      const created = new Date(Date.now() - hoursAgo * 3600 * 1000);
      const views = 500 + Math.floor(rng() * 48000);
      const readTime = 2 + Math.floor(rng() * 6);
      const author = pick(AUTHORS, rng);
      const tpl = idx < 6 ? (idx === 0 ? 'wide' : 'highlight') : pick(TEMPLATES, rng);
      const featured = idx < 8 ? 1 : (rng() < 0.08 ? 1 : 0);
      const image = `https://picsum.photos/seed/${a.i}/800/450`;

      db.run(
        `INSERT OR IGNORE INTO articles
          (title_km, title_en, content_km, content_en, slug, category_id, image_url,
           is_featured, card_template, created_at, updated_at, views_count,
           read_time_minutes, author_name, summary_km, summary_en)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [a.km, a.en, content.km, content.en, a.s, a.c, image,
         featured, tpl, fmtDate(created), fmtDate(created), views,
         readTime, author, a.sk, a.se],
        function () {
          if (this.changes > 0) {
            inserted++;
            const pool = (TAGS_BY_CAT[a.c] || []).map((s) => tagBySlug[s]).filter(Boolean);
            const count = Math.max(1, Math.min(pool.length, 1 + Math.floor(rng() * 3)));
            const chosen = [];
            let guard = 0;
            while (chosen.length < count && guard < 40) {
              guard++;
              const t = pick(pool, rng);
              if (t && chosen.indexOf(t) === -1) chosen.push(t);
            }
            chosen.forEach((tid) => {
              db.run('INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?,?)', [this.lastID, tid]);
            });
          } else {
            skipped++;
          }
          done++;
          if (done === total) {
            console.log(`Seed complete: ${inserted} inserted, ${skipped} already existed.`);
            db.get('SELECT COUNT(*) AS c FROM articles', [], (e, r) => {
              console.log(`Total articles now: ${r ? r.c : 'unknown'}`);
              db.close();
            });
          }
        }
      );
    });
  });
});
