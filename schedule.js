const daysOfWeekShortened = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const daysOfWeekShortenedLower = daysOfWeekShortened.map(it => it.toLowerCase())
const mergeLeading = 0.2, mergeSpace = 0.1;


function findGroupNames(items, itemBounds, startItemI) {
    const bs = itemBounds[startItemI];

    const namesSet = new Set();
    const is = { l: bs.l, r: bs.r, t: bs.t, b: bs.b };

    let totalHeight = bs.t - bs.b;
    let totalCount = 0;
    let curAdded;

    const addItems = (nI) => {
        const nItem = items[nI];
        if(nItem.str.trim() == '') return;
        if(namesSet.has(nI)) return;
        const ns = itemBounds[nI];

        const h = (totalHeight + nItem.height) / (totalCount+1);
        const lea = h * mergeLeading;
        if(!intersects(ns.b, ns.t, is.b - lea, is.t + lea)) return true;

        curAdded++;
        totalHeight = totalHeight + nItem.height;
        totalCount++;
        namesSet.add(nI)
        is.l = Math.min(is.l, ns.l)
        is.b = Math.min(is.b, ns.b)
        is.r = Math.max(is.r, ns.r)
        is.t = Math.max(is.t, ns.t)
    };

    let curI = startItemI;
    do { //add all items in row
        curAdded = 0;
        curI--;
        for(; curI >= 0; curI--) if(addItems(curI)) break;
        curI++;
        for(; curI < items.length; curI++) if(addItems(curI)) break;
    } while(curAdded !== 0);

    const itemsArr = Array.from(namesSet);
    itemsArr.sort((a, b) => {
        const aBs = itemBounds[a];
        const bBs = itemBounds[b];
        const aCenter = (aBs.l + aBs.r) * 0.5;
        const bCenter = (bBs.l + bBs.r) * 0.5;
        return aCenter - bCenter;
    })

    return itemsArr
}

function findColumnBounds(cont, itemBs, itemI) {
    const item = cont[itemI];
    const bs = itemBs[itemI];
    const itemCenter = 0.5 * (bs.l + bs.r)

    const itemsArr = findGroupNames(cont, itemBs, itemI)

    const spaces = []
    {
        const firstBs = itemBs[itemsArr[0]]
        let colL = firstBs.l, colR = firstBs.r;
        let colXTotal = (colL + colR) * 0.5;
        let colCount = 1;
        let prevColCenter = undefined;

        for(let i = 1;; i++) {
            let bs, center;
            if(i < itemsArr.length) {
                bs = itemBs[itemsArr[i]]
                center = (bs.l + bs.r) * 0.5;
                if(intersects(bs.l, bs.r, colL, colR)) {
                    colXTotal += center;
                    colCount++;
                    colL = Math.min(colL, bs.l)
                    colR = Math.max(colR, bs.r)
                    continue;
                }
            }

            const curColCenter = colXTotal / colCount;
            if(prevColCenter != undefined) spaces.push(Math.abs(curColCenter - prevColCenter));

            if(i >= itemsArr.length) break;
            prevColCenter = curColCenter;
            colXTotal = center;
            colCount = 1;
            colL = bs.l;
            colR = bs.r;
        }
    }

    const err = item.height * 0.05;
    let avg = 0;
    for(let i = 0; i < spaces.length; i++) avg += spaces[i];
    avg /= spaces.length;
    while(spaces.length > 1) {
        let maxI = 0, maxDiff = Math.abs(spaces[0] - avg)
        for(let i = 1; i < spaces.length; i++) {
            const diff = Math.abs(spaces[i] - avg);
            if(!(diff <= maxDiff)) {
                maxDiff = diff;
                maxI = i;
            }
        }
        if(maxDiff < err) break;
        spaces.splice(maxI, 1)

        avg = 0;
        for(let i = 0; i < spaces.length; i++) avg += spaces[i];
        avg /= spaces.length;
    }

    if(avg != undefined) return { l: itemCenter - avg*0.5, r: itemCenter + avg*0.5, t: bs.t, b: bs.b };
    else throw "Невозможно определить вертикальные границы расписания, [имя группы] = " + itemI + "/" + cont.length;
}

function calcItemBounds(item) {
    const h = 1;
    const w = item.width / item.height;

    const op = [[0,0], [0,h], [w,0], [w,h]]
    const a = item.transform[0], b = item.transform[1], c = item.transform[2], d = item.transform[3]

    const min = Number.MIN_VALUE, max = Number.MAX_VALUE;
    const bs = { l: max, b: max, r: min, t: min }
    for(let i = 0; i < 4; i++) {
        const x = op[i][0]
        const y = op[i][1]

        const xp = a*x + b*y;
        const yp = c*x + d*y;

        bs.l = Math.min(bs.l, xp)
        bs.b = Math.min(bs.b, yp)
        bs.r = Math.max(bs.r, xp)
        bs.t = Math.max(bs.t, yp)
    }

    bs.l += item.transform[4]
    bs.r += item.transform[4]
    bs.t += item.transform[5]
    bs.b += item.transform[5]

    return bs
}

function checkIsRegularSchedule(cont, itemBs) {
    function parseTime(str) {
        if(str.length < 4) return;
        const d = ':'.charCodeAt(0);

        let i = 0;
        let hour = 0;
        for(; i < 2; i++) {
            const ch = str.charCodeAt(i);
            if(ch === d) break;
            else if(ch < '0'.charCodeAt(0) || ch > '9'.charCodeAt(0)) return;
            else hour = hour*10 + (ch - '0'.charCodeAt(0));
        }
        if(str.charCodeAt(i) !== d) return;
        i++;

        let j = 0;
        let minute = 0;
        for(; i < str.length; i++, j++) {
            const ch = str.charCodeAt(i);
            if(ch < '0'.charCodeAt(0) || ch > '9'.charCodeAt(0)) return;
            else minute = minute*10 + (ch - '0'.charCodeAt(0));
        }
        if(j !== 2) return;

        return hour * 60 + minute;
}

    const daysOfWeek = [
        "Понедельник",
        "Вторник",
        "Среда",
        "Четверг",
        "Пятница",
        "Суббота",
        "Воскресенье"
    ];

    const daysOfWeekLower = daysOfWeek.map(a => a.toLowerCase())

    const dow = Array(daysOfWeek.length);
    let hoursR = -Infinity;
    const hours = [];
    for(let i = 0; i < cont.length; i++) {
        const str = cont[i].str.toLowerCase();
        for(let j = 0; j < daysOfWeek.length; j++) {
            if(str !== daysOfWeekLower[j]) continue;
            if(dow[j] != undefined) throw ["День недели " + j + " обнаружен дважды", "[дубликат] = " + i + "/" + cont.length];

            dow[j] = i;
            break;
        }

        if(i + 1 < cont.length) {
            const h = parseTime(cont[i].str);
            if(h != undefined) {
                for(let j = 1; j < 3; j++) {
                    let h2 = parseTime(cont[i+j].str);
                    if(h2 != undefined) {
                        hours.push({ first: i, last: i+j, sTime: h, eTime: h2 });
                        hoursR = Math.max(hoursR, itemBs[i].r, itemBs[i+j].r);
                        break
                    }
                }
            }
        }
    }

    return hours.length >= 2
}

const dateRegex = /^\d\d\.\d\d$/

function findDaysOfWeekHours(cont, itemBs, columnItemI) {
    const columnBs = itemBs[columnItemI]

    const dayItems = []
    const days = []
    let daysR = -Infinity;
    for(let i = 0; i < cont.length; i++) {
        const bs = itemBs[i]
        if(!intersects(bs.l, bs.r, columnBs.l, columnBs.r)) continue
        if(bs.b > columnBs.t) continue

        const curDayItems = []
        let curString = ''
        for(let j = 0; j < 5; j++) {
            curString = (curString + ' ' + cont[i + j].str).trim()
            curDayItems.push(i + j)

            const st = curString.toLowerCase()
            const shortDay = st.substring(0, 2).trim()
            const rest = st.substring(2).trim()
            if(daysOfWeekShortenedLower.includes(shortDay) && dateRegex.test(rest)) {
                dayItems.push(curDayItems)

                const arr = []
                arr.name = st
                days.push(arr)

                curDayItems.forEach(index => {
                    daysR = Math.max(daysR, itemBs[index].r)
                })
                break
            }
        }
    }

    if(days.length < 2) {
        let regular = false
        try {
            regular = checkIsRegularSchedule(cont, itemBs)
        }
        catch(err) {
            console.error(err)
        }

        if(regular) {
            throw (
                "Не удалось найти дни сессии, но удалось найти дни обычного расписания."
                + "<p>Проверьте, что загруженный файл является расписанием сессии.</p>"
                + "<p>Если вы хотите создать обычное расписание, "
                + "перейдите на главную: "
                + "<a href=\"/\">grouptimetable.github.io</a></p>"
            )
        }

        throw "В рассписании найдено меньше двух дней"
    }

    let daysT, daysHeight;
    {
        const d0 = dayItems[0]
        let sum0 = 0
        for(let i = 0; i < d0.length; i++) {
            sum0 += (itemBs[d0[i]].t + itemBs[d0[i]].b) * 0.5
        }
        const c0 = sum0 / d0.length

        const d1 = dayItems[1]
        let sum1 = 0
        for(let i = 0; i < d1.length; i++) {
            sum1 += (itemBs[d1[i]].t + itemBs[d1[i]].b) * 0.5
        }
        const c1 = sum1 / d1.length

        daysHeight = Math.abs(c1 - c0);
        daysT = c0 + daysHeight * 0.5;
    }

    return { days, daysC: days.length, daysR, daysT, daysHeight };
}

/*[a1; a2] & (b1, b2)*/
function intersects(a1, a2, b1, b2) {
    return a2 > b1 && a1 < b2;
}

function findDates(cont, bounds, colBounds, columnItemI) {
    const datesRegex = /\s?(\d\d)\.(\d\d)\.(\d\d\d\d)\s.*?\s(\d\d)\.(\d\d)\.(\d\d\d\d)/

    const itemBs = bounds[columnItemI]

    let str
    for(let i = 0; i < cont.length; i++) {
        const item = cont[i]
        const bs = bounds[i]
        if(!intersects(bs.l, bs.r, colBounds.l, colBounds.r)) continue
        if(!intersects(bs.b, bs.t, itemBs.b, itemBs.t)) continue

        if(str) str = str + ' ' + item.str
        else str = item.str
    }

    const gs = (str || '').match(datesRegex)
    if(gs) return [
        new Date(gs[3], gs[2] - 1, gs[1]),
        new Date(gs[6], gs[5] - 1, gs[4]),
    ]
}

function bigCheckEmpty(curCol, otherCol, leftSide, f, yOff, table) {
    var minCol, maxCol
    if(leftSide) {
        minCol = otherCol
        maxCol = curCol - 1
    }
    else {
        minCol = curCol + 1
        maxCol = otherCol
    }

    for(let x = minCol; x <= maxCol; x++) {
        const cell = table[yOff + x];
        // Bug: big fields currently don't check each other
        for(let i = 0; f.t && i < 2; i++) if(cell[i] !== undefined) return false
        for(let i = 2; f.b && i < 4; i++) if(cell[i] !== undefined) return false
    }

    {
        const cell = table[yOff + curCol];
        if(leftSide) {
            if(f.t) if(cell[0] !== undefined) return false
            if(f.b) if(cell[2] !== undefined) return false
        }
        else {
            if(f.t) if(cell[1] !== undefined) return false
            if(f.b) if(cell[3] !== undefined) return false
        }
    }

    return true
}

function findDatesColumn(cont) {
    let itemI = 0
    for(; itemI < cont.length; itemI++) {
        const item = cont[itemI]
        if(item.str.toLowerCase().trim() == 'срок') {
            break
        }
    }

    if(itemI == cont.length) {
        throw 'Столбец `Срок` не найден'
    }
    return itemI
}

function makeSchedule(cont, pageView, groupNameI) {
    if(cont.length < 1) throw 'Unreachable'

    const itemBs = Array(cont.length);
    for(let i = 0; i < itemBs.length; i++) itemBs[i] = calcItemBounds(cont[i]);

    const pageR = Math.max(pageView[0], pageView[2])
    const colBounds = findColumnBounds(cont, itemBs, groupNameI);
    const datesI = findDatesColumn(cont, itemBs)
    const { days, daysC, daysR, daysT, daysHeight } = findDaysOfWeekHours(cont, itemBs, datesI);
    const dates = findDates(cont, itemBs, colBounds, datesI)
    const colWidth = colBounds.r - colBounds.l;

    const errX = colWidth * 0.02;
    const curColI = Math.max(0, Math.floor((colBounds.l - daysR + errX) / colWidth));
    const colC = Math.max(0, Math.floor((pageR - daysR + errX) / colWidth));
    const tableL = colBounds.l - curColI * colWidth, tableR = tableL + colC * colWidth;
    const tableT = daysT, tableB = tableT - daysC * daysHeight;
    const colFactor = 1 / colWidth, rowFactor = 1 / daysHeight;

    const table = Array(colC * daysC);
    for(let i = 0; i < table.length; i++) table[i] = Array(4);

    const addToCell = (cell, result, ifError) => {
        for(let i = 0; i < 4; i++) {
            if(cell[i] != undefined) { console.error('cell already filled!', ifError, i); continue; }
            cell[i] = result;
        }
    };
    const joinItems = (itemsIs) => {
        let result = '' + cont[itemsIs[0]].str;
        for(let i = 1; i < itemsIs.length; i++) result += ' ' + cont[itemsIs[i]].str;
        return result;
    };

    const writeGroup = (group) => {
        const cx = 0.5 * (group.l + group.r);
        const cy = 0.5 * (group.t + group.b);
        const x = Math.floor((cx - tableL) * colFactor);
        const y = Math.floor((tableT - cy) * rowFactor);
        if(!(x >= 0 && x < colC && y >= 0 && y < daysC)) return;

        const inCurCol = intersects(group.l, group.r, colBounds.l, colBounds.r);
        const result = inCurCol ? joinItems(group.items) : true/*debug: group.items[0]. We don't need text bc it won't be used, just use nonnul*/;
        addToCell(table[y * colC + x], result, [x, y])
    };

    //separate text into groups
    let lastGroup = undefined;
    for(let i = 0; i < cont.length; i++) {
        const item = cont[i];
        if(item.str.trim() === '') continue;
        const bounds = itemBs[i]
        const bi = bounds.b, ti = bounds.t;
        const li = bounds.l, ri = bounds.r;
        const cxi = 0.5 * (li + ri), cyi = 0.5 * (ti + bi);
        if(!(tableL <= cxi && cxi <= tableR && tableB <= cyi && cyi <= tableT)) continue;

        let appendToGroup = lastGroup !== undefined
        if(appendToGroup) {
            const h = Math.min(item.height, lastGroup.lineHeight)
            const lea = h * mergeLeading;
            appendToGroup = Math.abs(item.height - lastGroup.lineHeight) < h * 0.1
                && intersects(li, ri, lastGroup.l, lastGroup.r) && intersects(bi, ti, lastGroup.b - lea, lastGroup.t + lea);
        }

        if(appendToGroup) {
            lastGroup.items.push(i);
            lastGroup.l = Math.min(lastGroup.l, li)
            lastGroup.r = Math.max(lastGroup.r, ri)
            lastGroup.b = Math.min(lastGroup.b, bi)
            lastGroup.t = Math.max(lastGroup.t, ti)
        }
        else {
            if(lastGroup !== undefined) writeGroup(lastGroup);
            lastGroup = { items: [i], l: li, r: ri, t: ti, b: bi, lineHeight: cont[i].height };
        }
    }
    if(lastGroup !== undefined) writeGroup(lastGroup);

    const rowDayHour = (() => { const a = Array(daysC); a.length = 0; return a; })();
    const schedule = Array(days.length);
    for(let dayI = 0; dayI < days.length; dayI++) {
        const day = days[dayI];
        if(day == undefined) continue;
        schedule[dayI] = Array(0);
        for(let l = 0; l < 1; l++) rowDayHour.push([dayI, l])
    }

    //remove trailing empty lessons
    //? if day is completely empty => set to undefined ?
    for(let i = 0; i < days.length; i++) {
        const day = days[i]
        schedule[i] = day

        const cell = table[i*colC + curColI];
        let empty = true
        for(let i = 0; empty && i < cell.length; i++) empty = cell[i] == undefined;

        if(!empty) {
            for(let i = 0; i < cell.length; i++) cell[i] ??= '';
            // safe to do. Either all cells have same string value, or none
            const text = cell[0]
            // also includes some invalid times
            const timeRegex = /([0-1][0-9]|2[0-4]):([0-5][0-9]|60)/g

            let match
            let prevMatch
            while((match = timeRegex.exec(text)) != null) {
                if(prevMatch != null) {
                    const lessonText = text.substring(prevMatch.index + 5, match.index).trim()
                    day.push({ time: prevMatch[0], lessons: [lessonText, lessonText, lessonText, lessonText] })
                }
                prevMatch = match
            }
            if(prevMatch != null) {
                const lessonText = text.substring(prevMatch.index + 5).trim()
                day.push({ time: prevMatch[0], lessons: [lessonText, lessonText, lessonText, lessonText] })
            }
        }
    }

    const dayNames = []
    for(let i = 0; i < schedule.length; i++) {
        dayNames.push(schedule[i].name)
    }

    return [schedule, dayNames, dates]
}

function checkValid(...params) {
    for(let i = 0; i < params.length; i++) {
        const p = params[i]
        if(p != undefined && !(p > 0 && p < Infinity)) return false
    }
    return true
}

function drawTextCentered(renderer, texts, fontSize, cx, cy, widths) {
    const lineHeight = fontSize * renderer.fontHeightFac;
    const height = fontSize + lineHeight * (texts.length-1);
    const offY = cy - height*0.5 + fontSize;

    renderer.setFontSize(fontSize);
    for(let i = 0; i < texts.length; i++) {
        renderer.drawText(texts[i], cx - widths[i]*0.5, offY + i*lineHeight);
    }
}

const textBreak = new (function() {
    function arr(len) { const a = new Array(len); a.length = 0; return a }

    const tried = [];
    const objs = [
        { width: 0, height: 0, fontSize: 0, texts: arr(4), lineWidths: arr(4) },
        { width: 0, height: 0, fontSize: 0, texts: arr(4), lineWidths: arr(4) },
    ];

    let str, renderer, width, height;
    let bestI, lastI;

    this.init = function(string, rend, w, h) {
        str = string.trim();
        renderer = rend;
        width = w;
        height = h;

        // using height instead of size to ignore line height spacing
        const textWidth = renderer.textWidth(str);
        const scaledSize = Math.min(width / textWidth, h);

        const tmp = objs[0];
        tmp.texts.length = 0;
        tmp.texts[0] = str;
        tmp.lineWidths.length = 1;
        tmp.lineWidths[0] = textWidth * scaledSize;
        tmp.width = textWidth * scaledSize;
        tmp.height = scaledSize * renderer.fontHeightFac;
        tmp.fontSize = scaledSize;

        lastI = bestI = 0;

        tried.length = 0;
        tried.push(1);
    }

    this.remeasure = function(targetLines) {
        if(tried.includes(targetLines)) return true;

        const tmpI = 1 - bestI;
        const tmp = objs[tmpI];
        /*break text*/ {
            tmp.texts.length = 0;
            const maxOffset = Math.max(1, Math.log(str.length+1)) * Math.sqrt(str.length);
            const lineLen =  Math.floor(str.length / targetLines);

            let prev = 0, startFrom = 0;
            for(let i = 0; i < targetLines-1; i++) {
                const base = lineLen * (i+1);

                startFrom = Math.max(startFrom, base - maxOffset);

                let foundPos;
                for(let cur = base; cur >= startFrom; cur--) {
                    if(str[cur] === ' ') {
                        foundPos = cur;
                        break;
                    }
                }

                for(startFrom = Math.max(startFrom, base+1);
                    startFrom <= Math.min(str.length-1, base + maxOffset)
                        && !(startFrom - base >= base - foundPos);
                    startFrom++
                ) {
                    if(str[startFrom] === ' ') {
                        foundPos = startFrom++;
                        break;
                    }
                }

                if(foundPos) {
                    tmp.texts.push(str.substring(prev, foundPos));
                    prev = foundPos+1;
                }
            }

            tmp.texts.push(str.substring(prev));
        }

        const actualLines = tmp.texts.length;
        if(actualLines != targetLines) {
            if(tried.includes(actualLines)) return true;
            tried.push(actualLines);
        }
        tried.push(targetLines);

        /*calc sizes*/ {
            tmp.lineWidths.length = actualLines;

            let maxWidth = 0;
            for(let i = 0; i < actualLines; i++) {
                tmp.lineWidths[i] = renderer.textWidth(tmp.texts[i]);
                maxWidth = Math.max(maxWidth, tmp.lineWidths[i]);
            }
            const scaledSize = Math.min(
                width / maxWidth,
                height / ((actualLines-1) * renderer.fontHeightFac + 1)
            );

            for(let i = 0; i < tmp.lineWidths.length; i++) {
                tmp.lineWidths[i] *= scaledSize;
            }
            tmp.width = maxWidth * scaledSize;
            tmp.height = (actualLines-1) * renderer.fontHeightFac * scaledSize + scaledSize;
            tmp.fontSize = scaledSize;

            lastI = tmpI;
            if(tmp.fontSize > objs[bestI].fontSize) bestI = tmpI;
        }

        return false;
    }

    Object.defineProperty(this, 'best', { get: () => objs[+bestI] });
    Object.defineProperty(this, 'last', { get: () => objs[+lastI] });
})()

function calcFontSizeForBoundsSingle(renderer, text, w, h, widths/*out*/) {
    const textWidth = renderer.textWidth(text);
    // note: line height is font size if only 1 line
    const scaledSize = Math.min(w / textWidth, h);
    widths.length = 0;
    widths[0] = textWidth * scaledSize;
    return scaledSize;
}

function calcFontSizeForBounds(renderer, texts, w, h, widths/*out*/) {
    widths.length = 0;

    let largestWidth = 0;
    for(let i = 0; i < texts.length; i++) {
        const textWidth = renderer.textWidth(texts[i]);
        widths.push(textWidth);
        if(textWidth > largestWidth) largestWidth = textWidth;
    }

    const scaledSize = Math.min(
        w / largestWidth,
        h / ((texts.length-1) * renderer.fontHeightFac + 1)
    );
    for(let i = 0; i < widths.length; i++) widths[i] *= scaledSize;

    return scaledSize;
}

function drawLesson(textArr, yellowArr, renderer, lesson, secondWeek, x, y, w, h) {
    let drawYellow;
    if (lesson.trim() !== '') {
        drawYellow = secondWeek;
        textArr.push({ text: lesson, x, y, w, h });
    }
    if(drawYellow) yellowArr.push({ x, y, w, h });
    else renderer.drawRect(x, y, w, h);
}

function drawLessons(textArr, yellowArr, renderer, lesson, x, y, w, h) {
    const w2 = w*0.5;
    const h2 = h*0.5;
    const x2 = x + w2;
    const y2 = y + h2;

    const ll = lesson.lessons;
    const eqh1 = ll[0] === ll[1];
    const eqh2 = ll[2] === ll[3];
    const eqv1 = ll[0] === ll[2];
    const eqv2 = ll[1] === ll[3];

    let drawIndividual;
    if(eqh1 && eqh2 && eqv1 && eqv2) {
        drawLesson(textArr, yellowArr, renderer, ll[0], false, x, y, w, h);
        drawIndividual = 0;
    }
    else if(eqh1 || eqh2) {
        if(eqh1) drawLesson(textArr, yellowArr, renderer, ll[0], false, x, y, w, h2);
        else drawIndividual = (1 | 2);

        if(eqh2) drawLesson(textArr, yellowArr, renderer, ll[2], true, x, y + h2, w, h2);
        else drawIndividual = (4 | 8);
    }
    else if(eqv1 || eqv2) {
        if(eqv1) drawLesson(textArr, yellowArr, renderer, ll[0], false, x, y, w2, h);
        else drawIndividual = (1 | 4);

        if(eqv2) drawLesson(textArr, yellowArr, renderer, ll[1], false, x + w2, y, w2, h);
        else drawIndividual = (2 | 8);
    }
    else drawIndividual = (1 | 2 | 4 | 8);

    if((drawIndividual & 1) != 0) drawLesson(textArr, yellowArr, renderer, ll[0], false, x, y, w2, h2);
    if((drawIndividual & 2) != 0) drawLesson(textArr, yellowArr, renderer, ll[1], false, x2, y, w2, h2);
    if((drawIndividual & 4) != 0) drawLesson(textArr, yellowArr, renderer, ll[2], true, x, y2, w2, h2);
    if((drawIndividual & 8) != 0) drawLesson(textArr, yellowArr, renderer, ll[3], true, x2, y2, w2, h2);
}

//border factor is used inaccurately, but the difference should not be that big
async function renderSchedule(renderer, schedule, editParams) {
    const { rowRatio, borderFactor, drawBorder, dowOnTop, columns } = editParams

    const colWidth = 500
    const renderPattern = []

    const rowHeight = colWidth * rowRatio;
    const borderWidth = colWidth * borderFactor;
    const innerBorderWidth = colWidth * 2/500;
    const dowTopHeight = rowHeight * 0.4

    const signatureHeight = 40, signaturePadding = 4;
    const signatureHeightFull = borderWidth*0.5 + signatureHeight + signaturePadding*2;

    let maxHeight = 0;
    let firstHeight = Infinity, lastHeight = 0;

    const existing = []
    for(let j = 0; j < schedule.length; j++) {
        const day = schedule[j]
        if(!day || !day.length) continue
        existing.push(j)
    }

    function addColumn(begin, end) {
        const newCol = []
        let curRows = 0;

        for(let j = begin; j < end; j++) {
            const index = existing[j]
            if(index == null) break
            const day = schedule[index]
            curRows += day.length
            newCol.push(index)
        }

        if(curRows > 0) {
            curHeight = curRows * rowHeight
            if(dowOnTop) curHeight += dowTopHeight * newCol.length

            lastHeight = curHeight;
            if(firstHeight === Infinity) firstHeight = curHeight;
            if(curHeight > maxHeight) maxHeight = curHeight;
            renderPattern.push(newCol)
        }
    }
    const inOneCol = Math.max(1, Math.round(existing.length / columns))
    for(let i = 0; i < columns - 1; i++) {
        addColumn(i * inOneCol, i * inOneCol + inOneCol)
    }
    addColumn((columns - 1) * inOneCol, existing.length)

    const rowMaxHeight = maxHeight
    const heightIfSignFirst = Math.max(rowMaxHeight, firstHeight + signatureHeightFull);
    const heightIfSignLast  = Math.max(rowMaxHeight, lastHeight + signatureHeightFull);

    const pageHeight = Math.min(heightIfSignFirst, heightIfSignLast);
    const pageWidth = colWidth * renderPattern.length;
    const signFirst  = heightIfSignFirst < heightIfSignLast;
    const groupSize = { w: colWidth, h: colWidth * rowRatio };

    const ch = (num) => !(num >= 1 && num < Infinity)
    if(!(maxHeight > 0) || ch(pageWidth) || ch(pageHeight)) {
        await renderer.emptyInit();
        return;
    }

    await renderer.init(pageWidth, pageHeight)

    const dowArray = []
    const timeArr = []
    const yellowArr = []
    const lessonsArr = []
    const innerBorderOffset = (drawBorder
        ? Math.max(0, borderWidth - innerBorderWidth)
        : borderWidth + innerBorderWidth); // for both sides
    const startW = groupSize.w - innerBorderOffset;
    const dowColWidth = startW * 0.1;
    const timeColWidth = dowColWidth;

    renderer.setupRect(innerBorderWidth, false)
    for(let i = 0; i < renderPattern.length; i++) {
        const startX = i * groupSize.w + innerBorderOffset*0.5;
        let startY = innerBorderOffset*0.5;

        for(let j = 0; j < renderPattern[i].length; j++) {
            const index = renderPattern[i][j];
            if(index == undefined || schedule[index] == undefined) continue;
            const day = schedule[index];
            const rowsCount = day.length

            let x = startX;
            let y = startY;
            let w = startW;
            const h = groupSize.h - innerBorderOffset / rowsCount;
            const dayH = rowsCount * groupSize.h + (dowOnTop ? dowTopHeight : 0);

            const dowText = day.name
            if(dowOnTop) {
                dowArray.push({ text: dowText, x, y, w, h: dowTopHeight })
                renderer.drawRect(x, y, w, dowTopHeight)
                y += dowTopHeight;
            }
            else {
                dowArray.push({ text: dowText, x, y, w: dowColWidth, h: dayH - innerBorderOffset })
                renderer.drawRect(x, y, dowColWidth, dayH)
                x += dowColWidth;
                w -= dowColWidth;
            }

            const lessonW = w - timeColWidth;
            for(let i = 0; i < day.length; i++) {
                const lesson = day[i]
                const ly = y + i*h;
                renderer.drawRect(x, ly, timeColWidth, h)
                timeArr.push({ text: lesson.time, x, y: ly, w: timeColWidth, h })
                drawLessons(lessonsArr, yellowArr, renderer, lesson, x + timeColWidth, ly, lessonW, h)
            }

            startY += dayH;
        }
    }
    renderer.finalizeRects()

    renderer.setupRect(innerBorderWidth, true);
    for(let i = 0; i < yellowArr.length; i++) {
        const it = yellowArr[i];
        renderer.drawRect(it.x, it.y, it.w, it.h);
    }
    renderer.finalizeRects();

    if (drawBorder) {
        renderer.setupRect(borderWidth, false)
        for(let i = 0; i < renderPattern.length; i++) {
            const x = i * groupSize.w;
            let curY = 0;

            for(let j = 0; j < renderPattern[i].length; j++) {
                const index = renderPattern[i][j];
                if(index == undefined || schedule[index] == undefined) continue;
                const day = schedule[index];
                const height = day.length * groupSize.h + (dowOnTop ? dowTopHeight : 0);;
                renderer.drawRect(x, curY, groupSize.w, height)
                curY = curY + height;
            }
        }
        renderer.finalizeRects()
    }

    const signText = 'groupTimeTable.github.io';
    var signX, signY, signFontSize;
    /*calc signature size*/ {
        const maxWidth = colWidth*0.8;
        const maxHeight = signatureHeight;

        const width = renderer.textWidth(signText);
        const scaledSize = Math.min(maxWidth / width, maxHeight);

        const signWidth = width * scaledSize;
        const signHeight = scaledSize;

        const y = pageHeight - signaturePadding;
        let x;
        if(signFirst) x = signaturePadding;
        else x = pageWidth - signWidth - signaturePadding;

        renderer.setupRect(0, false, true);
        renderer.drawRect(x, y, signWidth, -signHeight);
        renderer.finalizeRects();

        signX = x;
        signY = y;
        signFontSize = scaledSize;
    }

    const widths = [];

    renderer.setupText(!dowOnTop);
    for(let i = 0; i < dowArray.length; i ++) {
        const it = dowArray[i];
        const t = it.text;
        const cx = it.x + it.w*0.5;
        const cy = it.y + it.h*0.5;

        let ww, hh;
        if(dowOnTop) { ww = it.w * 0.95; hh = it.h * 0.95; }
        else { ww = it.h * 0.95; hh = it.w * 0.95; }
        const size = calcFontSizeForBoundsSingle(
            renderer, t,
            ww - innerBorderWidth,
            hh - innerBorderWidth,
            widths
        );

        renderer.setFontSize(size);
        if(dowOnTop) renderer.drawText(t, cx - widths[0]*0.5, cy + size*0.5);
        else renderer.drawText(t, cx + size*0.5, cy + widths[0]*0.5);

    }
    renderer.finalizeTexts();

    renderer.setupText(true);
    for(let i = 0; i < timeArr.length; i++) {
        const it = timeArr[i];
        const t = it.text
        const cx = it.x + it.w * 0.5
        const cy = it.y + it.h * 0.5
        const size = calcFontSizeForBoundsSingle(
            renderer, t,
            it.h * 0.95 - innerBorderWidth,
            it.w * 0.95 - innerBorderWidth,
            widths
        );

        renderer.setFontSize(size);
        renderer.drawText(t, cx + size*0.5, cy + widths[0]*0.5, widths);
    }
    renderer.finalizeTexts();

    renderer.setupText(false);
    for(let i = 0; i < lessonsArr.length; i++) {
        const { text, x, y, w, h } = lessonsArr[i];

        const width = (w - innerBorderWidth) * 0.95, height = (h - innerBorderWidth) * 0.95;
        textBreak.init(text, renderer, width, height)

        for(let j = 0; j < 3; j++) {
            /*maximize text width*/ {
                const el = textBreak.last;
                const scaledHeight = el.height * width / el.width;
                const lines = Math.max(1, Math.round(el.texts.length * Math.sqrt(height / scaledHeight)));
                if(textBreak.remeasure(lines)) break;
            }

            /*maximize text height*/ {
                const el = textBreak.last;
                const scaledWidth = el.width * height / el.height;
                const lines = Math.max(1, Math.round(el.texts.length * Math.sqrt(scaledWidth / width)));
                if(textBreak.remeasure(lines)) break;
            }
        }

        const res = textBreak.best;
        renderer.setImportant(!text.toLowerCase().includes('консультация'))
        drawTextCentered(renderer, res.texts, res.fontSize, x + w*0.5, y + h*0.5, res.lineWidths);
    }
    renderer.finalizeTexts();

    renderer.setupText(false);
    renderer.setFontSize(signFontSize);
    renderer.drawText(signText, signX, signY);

    renderer.finalizeTexts();
}
