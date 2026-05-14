/**
 * One-off seed: imports member registration data extracted from the GCC
 * Google Sheet (Tuklasin tracker, member-registration tab).
 *
 * Cleaning rules:
 *   - Names are trimmed and stripped of stray trailing commas/quotes.
 *   - Birthdate parsed from M/D/YYYY.
 *   - civilStatus defaults to "Single" (the sheet's column was usually blank).
 *   - employmentStatus defaults to "None".
 *   - contactNumber only kept if it matches PH mobile pattern (9XXXXXXXXX);
 *     dots / "N/A" / non-matching strings are dropped.
 *   - permanentAddress defaults to "N/A" when missing.
 *   - Rows missing firstName, lastName, gender, OR birthdate are skipped.
 *   - Duplicates (same firstName + lastName + birthdate) are skipped.
 *
 * Idempotent — running it twice doesn't create duplicates.
 *
 * Usage:  npm run seed:members
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Member = require('../models/Member');

// Raw rows lifted from the sheet. Each tuple:
// [lastName, firstName, middleName, gender, birthdate (M/D/YYYY),
//  educational, civilStatus, dateOfMarriage, spouse, contactNumber,
//  permanentAddress, presentAddress, email, employmentStatus,
//  isBaptized, churchBaptized, dateBaptized]
const ROWS = [
  ['Gade','Rodrigo','Villarias','Male','6/8/2004','College','Single','','','9053720639','Brgy. Sta Filomena, San Pablo City, Laguna','Brgy. Sta Filomena, San Pablo City, Laguna','','Employed (Public)','No','',''],
  ['Hernandez','Eidderf Andrei','O.','Male','12/2/2003','','','','','9308586470','Brgy San Juan, San Pablo City, Laguna','Brgy San Juan, San Pablo City, Laguna','','','','',''],
  ['Siao','Ronan','','Male','2/5/2009','','','','','','P. Alcantara St., San Pablo City, Laguna','P. Alcantara St., San Pablo City, Laguna','','','','',''],
  ['Mendoza','Jennifer','Tañon','Female','7/1/1976','','','','','9158418211','054 Fule Sahagun St., SPC','054 Fule Sahagun St., SPC','','','','',''],
  ['Opeña','Xairon James','D.','Male','10/7/2002','','','','','9518904190','#148, brgy.2-A San Pablo City Laguna','#148, brgy.2-A San Pablo City Laguna','','','','',''],
  ['Falejo','Jasmin','Maalihan','Female','1/25/1990','','','','','9300415177','Lusacan, Tiaong, Quezon','Lusacan, Tiaong, Quezon','','','','',''],
  ['Rosairo','Alfredo Sereno','Ranjith','Male','3/7/1957','','','','','9381661800','Brgy. Malaya, Nagcarlan, Laguna','Brgy. Malaya, Nagcarlan, Laguna','','','','',''],
  ['Tantoy','William','S.','Male','10/10/1983','','','','','9611510179','Bria Homes SPC','Bria Homes SPC','','','','',''],
  ['Tantoy','Liza','','Female','6/16/1986','','','','','9214053210','Bria Homes SPC','Bria Homes SPC','','','','',''],
  ['Tunay','Raymundo','I','Male','1/23/1962','','','','','9074348066','Brgy 2 San Isidro SPC','Brgy 2 San Isidro SPC','','','','',''],
  ['Paligutan','Art Vence','Yrigan','Male','7/30/1999','','','','','9770111106','6239 pili street brgy. 178 camarin caloocan city','6239 pili street brgy. 178 camarin caloocan city','','','','',''],
  ['Morota','Roselyn','B.','Female','11/24/1971','','','','','9512179253','Brgy San Gabriel Sitio 1, SPC Laguna','Brgy San Gabriel Sitio 1, SPC Laguna','','','','',''],
  ['Obrano','Liwayway','U.','Female','9/12/1978','','','','','9665375053','San Crispin SPC','San Crispin SPC','','','','',''],
  ['Obrado','Daniel','U.','Male','1/24/2005','N/A','Single','','','9852385901','San Crispin SPC','San Crispin SPC','qwerasdf@a.com','None','Yes','asdfasdfvcxz','11/1/2024'],
  ['Buera','Krishmae','','Female','9/13/2005','','','','','9566799675','San Benito Alaminos','San Benito Alaminos','','','','',''],
  ['Aracena','Lucita','','Female','7/29/1954','','','','','9620546417','Sta Cruz SPC','Sta Cruz SPC','','','','',''],
  ['Aclan','Gina','','Female','3/25/1965','','','','','9306969049','P. Alcantara SPC','P. Alcantara SPC','','','','',''],
  ['Dungo','Mercy','','Female','3/30/1972','','','','','','Orchid St. SPC','Orchid St. SPC','','','','',''],
  ['Esguerra','Roi Oel','','Male','12/23/2006','','','','','9061479027','Brgy San Diego','Brgy San Diego','','','','',''],
  ['Marjes','Russel','','Male','10/1/1993','','','','','9956355663','San Jose, Purok 5, San Pablo City, Laguna','San Jose, Purok 5, San Pablo City, Laguna','','','','',''],
  ['Fernandez','Aiyenne Denise','C','Female','7/18/2002','','','','','9982494071','Brgy San Nicolas SPC','Brgy San Nicolas SPC','','','','',''],
  ['Lacson','Romellyn','P.','Female','7/22/2007','','','','','9534896486','San Gregorio SPC','San Gregorio SPC','','','','',''],
  ['Fernando','Lara Jane','U.','Female','11/22/2007','','','','','9560491745','Sta Veronica SPC','Sta Veronica SPC','','','','',''],
  ['Marjes','Hazel Ann','B.','Female','12/24/2001','','','','','9294222379','San Jose Malamig SPC','San Jose Malamig SPC','','','','',''],
  ['Marjes','Raquel','','Female','2/1/1974','','','','','9558343351','San Jose Malamig SPC','San Jose Malamig SPC','','','','',''],
  ['Calilong','Mark Anthony','Galvez','Male','5/3/1993','','','','','9176384107','Ph.2A, Blk. 2, Lt.2, Acacia St., Urban Deca Homes, Abangan Sur, Marilao, Bulacan','Ph.2A, Blk. 2, Lt.2, Acacia St., Urban Deca Homes, Abangan Sur, Marilao, Bulacan','','','','',''],
  ['Mendoza','Sherwien','Reyes','Male','5/25/1978','','','','','','Fule Sahagun SPC (DUBAI)','Fule Sahagun SPC (DUBAI)','','','','',''],
  ['Hernandez','Lolita','D.','Female','8/30/1943','','','','','9286840573','22 F-Reyes St. Reyes Subd. Kar. Valenzuela City','22 F-Reyes St. Reyes Subd. Kar. Valenzuela City','','','','',''],
  ['Poloyapoy','Elisa','Discar','Female','10/12/1945','','','','','9995668070','22 F. Reyes Compound Karuhatan Valenzuela City','22 F. Reyes Compound Karuhatan Valenzuela City','','','','',''],
  ['Marasigan','Amelia','Dimalanta','Female','2/15/1944','','','','','9512179253','Barangay san gabrile sitio 1','Barangay san gabrile sitio 1','','','','',''],
  ['Poloyapoy','Kimberly','Montales','Female','11/22/1995','','','','','9761602678','22 F. Reyes Compound Karuhatan Valenzuela City','22 F. Reyes Compound Karuhatan Valenzuela City','','','','',''],
  ['Pacardo','Roshelle','M.','Female','2/8/1985','','','','','9120073695','N/A','N/A','','','','',''],
  ['Arguelles','Rosa','Montefalcon','Female','9/4/1961','','','','','9615051561','Brgy Buboy Nag Laguna','Brgy Buboy Nag Laguna','','','','',''],
  ['Cruzin','Regalado','V.','Male','5/13/1974','','','','','9322643926','Banago Nagcarlan Laguna','Banago Nagcarlan Laguna','','','','',''],
  ['Delgado','Fritzie','B.','Female','2/7/1994','','','','','9667531314','San Lucas','San Lucas','','','','',''],
  ['Potestad','Lynne','P.','Female','9/30/1969','','','','','9956787102','83A Purok 1, brgy Dolores SPC','83A Purok 1, brgy Dolores SPC','','','','',''],
  ['Paksiw','Mila','','Female','5/1/1968','','','','','','Brgy 7D SPC','Brgy 7D SPC','','','','',''],
  ['Gangat','Gorgonio','P.','Male','9/15/1973','','','','','','San Nicolas SPC','San Nicolas SPC','','','','',''],
  ['Rivera','Remely','','Female','9/2/1968','','','','','9556594759','San Crispin San Pablo City','San Crispin San Pablo City','','','','',''],
  ['Buera','Ruby','','Female','10/14/1945','','','','','9556594759','San Lucas SPC','San Lucas SPC','','','','',''],
  ['Eseo','Quiruben','B.','Male','5/29/1972','','','','','9062342400','Brgy Bautista SPC','Brgy Bautista SPC','','','','',''],
  ['Madrigal','Jan Bill','','Male','1/29/2004','','','','','9811760934','San Pedro SPC','San Pedro SPC','','','','',''],
  ['Cochesa','Adriane Zerjay','T.','Male','9/21/2005','','','','','9214791365','Brgy San Benito Alaminos Laguna','Brgy San Benito Alaminos Laguna','','','','',''],
  ['Viriña','Maryl Sofia','','Female','9/8/2001','','','','','9664735612','Brgy Malaya Nagcarlan Laguna','Brgy Malaya Nagcarlan Laguna','','','','',''],
  ['Olviga','Rona Ruth','A.','Female','8/16/1977','','','','','','Brgy Malaya Nagcarlan','Brgy Malaya Nagcarlan','','','','',''],
  ['Chavez','Lolita','De','Female','2/9/1956','','','','','','Malaya Nagcarlan Laguna','Malaya Nagcarlan Laguna','','','','',''],
  ['Pasco','Crystalyn','','Female','7/6/1988','','','','','9998735454','Lynville Del Remedio','Lynville Del Remedio','','','','',''],
  ['Panaligan','Axcel Rose','C.','Female','2/2/2002','','','','','','Del Remedio','Del Remedio','','','','',''],
  ['Biconda','Robert','','Male','11/8/1972','','','','','9218985311','San Roque SPC','San Roque SPC','','','','',''],
  ['Cartel','Raffy','','Male','9/28/1972','','','','','9352845162','Teresa Rizal','Teresa Rizal','','','','',''],
  ['Cartel','Tess','','Female','2/8/1969','','','','','9389323706','Canssa Homes Teresa Rizal','Canssa Homes Teresa Rizal','','','','',''],
  ['Cartel','Gian Trizia','Mae','Female','8/31/2005','','','','','','Teresa Rizal','Teresa Rizal','','','','',''],
  ['Alviz','Teresita','B.','Female','10/2/1967','','','','','9090401720','Brgy 2-B, Guadalupe 1, SPC','Brgy 2-B, Guadalupe 1, SPC','','','','',''],
  ['Aquilo','Crisologo','Caponpon','Male','12/2/1957','','','','','9260075059','Barangay San Lucas 1 SPC','Barangay San Lucas 1 SPC','','','','',''],
  ['Aquilo','Lorena','Basilio','Female','12/17/1969','','','','','9309110037','San Lucas 1 SPC','San Lucas 1 SPC','','','','',''],
  ['Mayo','Myra','','Female','7/1/1989','','','','','9127714081','San Lucas 1 SPC','San Lucas 1 SPC','','','','',''],
  ['Pantaleon','Ralido','Discar','Male','7/11/1969','','','','','9357692870','F. Reyes Comp. Sto. Rosario St. Karuhatan Valenzuela City','4th floor Llaros Appt. Holy Rosary St. Brgy. VI-C San Pablo City','','','','',''],
  ['Gutierrez','Jered','Pamis','Female','12/29/1990','','','','','9279108923','0498 Purok 4, Brgy. San Lucas 2, San Pablo City, Laguna','0498 Purok 4, Brgy. San Lucas 2, San Pablo City, Laguna','','','','',''],
  ['Gutierrez','Joane','Buera','Female','1/21/1984','','','','','9951268381','0498 Purok 4 Brgy. San Lucas 2, San Pablo City Laguna','0498 Purok 4 Brgy. San Lucas 2, San Pablo City Laguna','','','','',''],
  ['Dizon','Nery','Buera','Female','5/27/1959','','','','','9977111975','1888 Brgy Sta Monica SPC','1888 Brgy Sta Monica SPC','','','','',''],
  ['Dizon','Janette Ashley','B.','Female','11/30/1999','','','','','9772043453','1888 Purok 8 Brgy. Santa Monica San Pablo City, Laguna','1888 Purok 8 Brgy. Santa Monica San Pablo City, Laguna','','','','',''],
  ['Gutierrez','Peter','','Male','9/2/1983','','','','','9165618138','purok 4 brgy. san lucas 2 san pablo city','San Pablo City Laguna','','','','',''],
  ['De Rapete','Jellan','Tan','Female','11/29/2007','','','','','9508997410','21 p. alcantara st. brgy 7b san pablo city laguna','21 p. alcantara st. brgy 7b san pablo city laguna','','','','',''],
  ['Tan','Juliana Marie','Exconde','Female','3/8/2008','','','','','9053571059','P. Alcantara St San Pablo city','P. Alcantara St San Pablo city','','','','',''],
  ['Estrella','Ligaya','H.','Female','6/26/1979','','','','','9666325016','22 F. Reyes Subdivision Karuhatan Valenzuela City','22 F. Reyes Subdivision Karuhatan Valenzuela City','','','','',''],
  ['Juanillo','Djoanna Marie','Gregorio','Female','8/6/1979','','','','','','San Pablo City','Bangkok, Thailand','','','','',''],
  ['Rosairo','Melanie','Ponce','Female','4/17/1983','','','','','9081333841','D-076 Norasville Subd. Bambang Nagcarlan, Laguna','D-076 Norasville Subd. Bambang Nagcarlan, Laguna','','','','',''],
  ['Ponce','Luciana','Montefalcon','Female','10/9/1960','','','','','9074211482','D-076 Norasville Subd. Bambang Nagcarlan, Laguna','Brgy. Buboy Nagcarlan, Laguna','','','','',''],
  ['Deogracias','Ellamae','Ramirez','Female','10/4/1993','','','','','9989400112','264 San Benito Alaminos, Laguna','264 San Benito Alaminos, Laguna','','','','',''],
  ['Codia','Abbie','Aquilo','Female','3/7/1994','','','','','9177730239','0240 Brgy San Lucas 1 San Pablo City Laguna','0240 Brgy San Lucas 1 San Pablo City Laguna','','','','',''],
  ['Tanazana','Helene','Bibe','Female','12/21/1965','','','','','9469037766','Brgy San Pedo SPC','Brgy San Pedo SPC','','','','',''],
  ['De Rapete','Kurt Rojen','Tan','Male','11/4/2003','','','','','9462104877','21 P.Alcantara Street, Brgy 7-B, San Pablo City, Laguna 4000','21 P.Alcantara Street, Brgy 7-B, San Pablo City, Laguna 4000','','','','',''],
  ['Regencia','Julieta','Sabado','Female','2/7/1957','','','','','9194021069','906 Dagatan Blvd., San Lucas 1 SPC','906 Dagatan Blvd., San Lucas 1 SPC','','','','',''],
  ['Malabuyoc','Limuel','Sumague','Male','7/15/2000','','','','','9478899675','Brgy. 6-E San Pablo City','Brgy. 6-E San Pablo City','','','','',''],
  ['Codia','Emmanuel','Olivenza','Male','2/17/1994','','','','','9171526384','0240 San Lucas 1 San Pablo City','0240 San Lucas 1 San Pablo City','','','','',''],
  ['Mendoza','Trent Justin','T.','Male','7/31/2007','','','','','9454621192','054 Fule Sahagun St San Pablo City Laguna','054 Fule Sahagun St San Pablo City Laguna','','','','',''],
  ['Capila','Lemuel','Maravilla','Male','1/4/1991','','','','','9384566077','Purok 6, San Antonio 1, San Pablo City','Purok 6, San Antonio 1, San Pablo City','','','','',''],
  ['Capila','Lovely','Maravilla','Female','3/21/1996','','','','','9387465297','0955 Purok Arawan, Brgy. San Antonio 1, San Pablo City','0955 Purok Arawan, Brgy. San Antonio 1, San Pablo City','','','','',''],
  ['Rosairo','Junius Rodney','Sarmiento','Male','6/30/1983','','','','','9266384757','D-076 Norasville Subd. Bambang, Nagcarlan, Laguna','D-076 Norasville Subd. Bambang, Nagcarlan, Laguna','','','','',''],
  ['Pantaleon','Maria Loreta','Suarez','Female','5/1/1970','','','','','9264122269','22 F. Reyes Subdivision Sto Rosairo St. Karuhatan Valenzuela City','9003 (0403) Holy Rosary St. Bagong Pook, SPC','','','','',''],
  ['Dizon','Arnel','Javier','Male','8/23/1955','','','','','9761943553','1888 Brgy. Sta. Monica SPC','1888 Brgy. Sta. Monica SPC','','','','',''],
  ['Gutierrez','Nicole Andrea','B.','Female','7/5/2003','','','','','9459951275','Barangay San Lucas 2, San Pablo City','Barangay San Lucas 2, San Pablo City','','','','',''],
  ['Estrella','Vince Lester','H.','Male','9/13/2006','','','','','9056712542','22 F Reyes Subdivision Karuhatan Valenzuela City','22 F Reyes Subdivision Karuhatan Valenzuela City','','','','',''],
  ['Ponce','Eugenio','Monserrat','Male','9/21/1957','','','','','9074211482','D076 Norasville Bambang Nagcarlan Laguna','D076 Norasville Bambang Nagcarlan Laguna','','','','',''],
  ['Rosairo','Nieves','Sarmiento','Female','8/5/1955','','','','','9489185618','Malaya Nagcarlan Laguna','Malaya Nagcarlan Laguna','','','','',''],
  ['Malabuyoc','Jhomelle','A','Male','3/19/1997','','','','','9630875597','Oreta Compd brgy. San Jose spc','Oreta Compd brgy. San Jose spc','','','','',''],
  ['Mier','Thelma','Malabuyoc','Female','10/4/1973','','','','','9494581776','Brgy Dolores Purok 1 SPC','Brgy Dolores Purok 1 SPC','','','','',''],
  ['Malabuyoc','Estelita','Alcazar','Female','1/31/1947','','','','','','Coco land Brgy del Remedio SPC','Coco land Brgy del Remedio SPC','','','','',''],
  ['Poloyapoy','Sed','Discar','Male','11/2/1984','','','','','9995668070','22 F. Reyes Karuhatan Valenzuela City','22 F. Reyes Karuhatan Valenzuela City','','','','',''],
  ['Ardeza','Rosalino','Busiños','Male','8/30/1938','','','','','9184565610','57 Rizal Ave. Pob. 2 Nagcarlan, Laguna','57 Rizal Ave. Pob. 2 Nagcarlan, Laguna','','','','',''],
  ['Ortega','Lamberto','Eviya','Male','7/7/1938','','','','','9216472675','Green Valley Subd. San Francisco San Pablo City','Green Valley Subd. San Francisco San Pablo City','','','','',''],
];

const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated'];
const EMPLOYMENT_STATUSES = [
  'Employed (Public)', 'Employed (Private)', 'Self-Employed',
  'Unemployed', 'Student', 'Retired', 'None',
];
const EDUCATIONAL_STATUSES = [
  'Elementary', 'High School', 'Senior High School', 'Vocational',
  'College', 'Postgraduate', 'OSY', 'N/A',
];

const cleanName = (s) => (s || '').replace(/[",]+$/g, '').trim();
const cleanDot = (s) => (s || '').replace(/\s+/g, ' ').trim();
const parseDate = (s) => {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, da, yr] = m;
  const d = new Date(Number(yr), Number(mo) - 1, Number(da));
  if (isNaN(d.getTime())) return null;
  return d;
};

const seed = async () => {
  await connectDB();
  let created = 0;
  let skippedDup = 0;
  let skippedBad = 0;
  const skippedRows = [];

  for (const row of ROWS) {
    const [
      lastNameRaw, firstNameRaw, middleNameRaw, gender, birthdateRaw,
      educational, civilStatusRaw, dateOfMarriageRaw, spouseRaw, contactRaw,
      permanentAddressRaw, presentAddressRaw, emailRaw, employmentRaw,
      isBaptizedRaw, churchBaptizedRaw, dateBaptizedRaw,
    ] = row;

    const lastName = cleanName(lastNameRaw);
    const firstName = cleanName(firstNameRaw);
    const middleName = cleanName(middleNameRaw);
    const birthdate = parseDate(birthdateRaw);

    if (!lastName || !firstName || !gender || !birthdate) {
      skippedBad += 1;
      skippedRows.push(`${lastNameRaw || '(no last)'} / ${firstNameRaw || '(no first)'} — missing required field`);
      continue;
    }

    // Dedup by name + birthdate
    const dup = await Member.findOne({
      firstName: new RegExp(`^${firstName}$`, 'i'),
      lastName: new RegExp(`^${lastName}$`, 'i'),
      birthdate,
    });
    if (dup) {
      skippedDup += 1;
      continue;
    }

    // Contact number: only keep if valid PH mobile format
    const contactClean = cleanDot(contactRaw);
    const contactNumber = /^9\d{9}$/.test(contactClean) ? contactClean : undefined;

    // Permanent address: required, fall back to "N/A"
    const permanentAddress = cleanDot(permanentAddressRaw) || 'N/A';
    const presentAddress = cleanDot(presentAddressRaw);

    // Defaults for sheet's empty columns
    const civilStatus = CIVIL_STATUSES.includes(civilStatusRaw) ? civilStatusRaw : 'Single';
    const employmentStatus = EMPLOYMENT_STATUSES.includes(employmentRaw) ? employmentRaw : 'None';
    const educationalStatus = EDUCATIONAL_STATUSES.includes(educational) ? educational : 'N/A';

    const isBaptized = String(isBaptizedRaw).trim().toLowerCase() === 'yes';

    const payload = {
      lastName,
      firstName,
      middleName,
      gender,
      birthdate,
      civilStatus,
      employmentStatus,
      educationalStatus,
      permanentAddress,
      presentAddress: presentAddress && presentAddress !== permanentAddress ? presentAddress : '',
      email: cleanDot(emailRaw) || '',
      contactNumber,
      isBaptized,
      churchBaptized: isBaptized ? cleanDot(churchBaptizedRaw) : '',
      dateBaptized: isBaptized ? parseDate(dateBaptizedRaw) : null,
      dateOfMarriage: civilStatus === 'Married' ? parseDate(dateOfMarriageRaw) : null,
      spouse: civilStatus === 'Married' ? cleanDot(spouseRaw) : '',
      memberStatus: 'New Attendee',
    };

    try {
      await Member.create(payload);
      created += 1;
    } catch (err) {
      skippedBad += 1;
      skippedRows.push(`${lastName}, ${firstName} — ${err.message}`);
    }
  }

  console.log(`\n[Seed] Members from sheet`);
  console.log(`  Created:        ${created}`);
  console.log(`  Skipped (dup):  ${skippedDup}`);
  console.log(`  Skipped (bad):  ${skippedBad}`);
  if (skippedRows.length > 0) {
    console.log('\n  Bad rows:');
    skippedRows.forEach((r) => console.log(`    - ${r}`));
  }
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error('[Seed] Failed:', err.message);
  process.exit(1);
});
