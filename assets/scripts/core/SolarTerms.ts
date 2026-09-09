export type SolarTermPalette = {
    name: string;
    sourceColors: readonly [string, string, string, string];
    colors: readonly [string, string, string, string];
};

// Source references: https://cncolor.art/solar-terms
// Approved A direction. Display colors are designed adaptations, not original
// traditional-color HEX values. Roles: main, light transition, peach, accent.
// Explicit values replace the previous global saturation/contrast conversion.
export const SOLAR_TERM_PALETTES: readonly SolarTermPalette[] = [
    {name:'立春',sourceColors:['#FFF799','#D5EBE1','#8B7042','#F3A694'],colors:['#E6B354','#F1CD7B','#EFA580','#A9BE89']},
    {name:'雨水',sourceColors:['#F9D3E3','#BEB1AA','#E5A84B','#C0D695'],colors:['#E7AE67','#F2CC8F','#ECA4A8','#A5BD93']},
    {name:'惊蛰',sourceColors:['#BA5B49','#F6BEC8','#FEDC5E','#9AA7B1'],colors:['#E9AF4B','#F4C96B','#F29B75','#E891AA']},
    {name:'春分',sourceColors:['#EBEEE8','#D2AF9D','#EA5514','#3271AE'],colors:['#EAB361','#F2CE8C','#EC9E83','#92B6CC']},
    {name:'清明',sourceColors:['#A6559D','#BEC2B3','#D3CCD6','#CB5C83'],colors:['#D8A768','#EBC792','#D99DAE','#AD9AC4']},
    {name:'谷雨',sourceColors:['#DCC7E1','#A8BF8F','#AED0EE','#BD8253'],colors:['#DFB56F','#EED098','#DEA1B7','#9ABBA2']},
    {name:'立夏',sourceColors:['#C3D94E','#DFCEB4','#BEC2BC','#F29A76'],colors:['#DFB74F','#EFD07B','#EDAB78','#A8BF82']},
    {name:'小满',sourceColors:['#E2A2AC','#6A8D52','#D4C9AA','#F2C867'],colors:['#E7B15B','#F1CB85','#ECA28D','#A0B988']},
    {name:'芒种',sourceColors:['#D5D1AE','#B3B59C','#DDBB99','#535164'],colors:['#DDB051','#EDC77B','#E4A573','#A9BB8B']},
    {name:'夏至',sourceColors:['#CB523E','#B2B6B6','#F0C2A2','#F5F3F2'],colors:['#EDA25F','#F4C588','#EFAD91','#DEA0AC']},
    {name:'小暑',sourceColors:['#F5B087','#E0DFC6','#954024','#106898'],colors:['#EEAD5C','#F4CE87','#EDA17F','#92B9CB']},
    {name:'大暑',sourceColors:['#E3ADB9','#EDF1BB','#D4BF89','#BED2BB'],colors:['#E6B66B','#F1D093','#E7A7B6','#A1BCA0']},
    {name:'立秋',sourceColors:['#88ABDA','#98B6C2','#EFEFEF','#C0D09D'],colors:['#DFB360','#EECC8E','#E8A67E','#9CAED0']},
    {name:'处暑',sourceColors:['#F0CFE3','#C9CFC1','#A2D2E2','#EAD89A'],colors:['#E5B677','#F0D19F','#E5A6BC','#96BDBA']},
    {name:'白露',sourceColors:['#F5F2E9','#86908A','#D3CBC5','#C4B798'],colors:['#DDB97C','#EBD2A4','#DFAE9F','#9FB6A8']},
    {name:'秋分',sourceColors:['#D5E3D4','#C0AD5E','#4994C4','#EAEEF1'],colors:['#DDB25B','#EDCD8D','#E6AE81','#92B5CB']},
    {name:'寒露',sourceColors:['#A6BAB1','#DDB078','#8BA3C7','#ECD9C7'],colors:['#DEAD64','#EEC991','#E5AE97','#9EAFCB']},
    {name:'霜降',sourceColors:['#D12920','#BDB2B2','#F8C6B5','#DFD7C2'],colors:['#E4A16B','#EFC48D','#E79E8E','#C49BAE']},
    {name:'立冬',sourceColors:['#FFFBC7','#88BFB8','#9E8C6B','#A88787'],colors:['#DEB76D','#EECF94','#DDA89B','#92BBB3']},
    {name:'小雪',sourceColors:['#DE82A7','#E67762','#D4E5EF','#9E8368'],colors:['#DEAE7F','#EFCB9F','#E5A0B6','#9CBBD0']},
    {name:'大雪',sourceColors:['#EFC4CE','#EEEAD9','#788A6F','#A4ABD6'],colors:['#DCB781','#EDD1A5','#E7ADB9','#AEA5CE']},
    {name:'冬至',sourceColors:['#E7CAD3','#DAA9A9','#EBE1A9','#796860'],colors:['#E3B367','#F1CF8D','#E5A3AD','#CA9BA9']},
    {name:'小寒',sourceColors:['#F6F9E4','#BD9683','#7D929F','#A4C9CC'],colors:['#DEB976','#EDD19E','#DDA998','#99BDC0']},
    {name:'大寒',sourceColors:['#995D7F','#EBE3C7','#DDC5B8','#C8B6BB'],colors:['#D8AD85','#E9CCA7','#DDA9AD','#B49ABC']},
];

export function solarTermForLevel(levelIndex:number):SolarTermPalette{
    const index=((Math.trunc(levelIndex)%SOLAR_TERM_PALETTES.length)+SOLAR_TERM_PALETTES.length)%SOLAR_TERM_PALETTES.length;
    return SOLAR_TERM_PALETTES[index];
}
