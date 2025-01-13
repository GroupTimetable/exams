const warningText = document.querySelector('.warning-text');

const params = (_ => {
    try {
        const prmstr = window.location.search.split("=");
        const sid = prmstr[1];
        if(sid) {
            const p = JSON.parse(sessionStorage.getItem(sid));
            if(p != undefined) return p
        }
        throw 'Не удалось получить расписание для редактирования'
    }
    catch(e) {
        console.error(e)
        warningText.style = 'color: var(--error-color);';
        warningText.innerText = e.toString()
    }
}
)()


const yearEl = document.querySelector('#year')
yearEl.value = new Date(params.dates[0]).getFullYear()


document.querySelector('#file1').addEventListener('click', () => {
    saveDoc()
})

function saveDoc() {
    try {
        const [str, warn] = scheduleToICS(params.schedule, params.dayNames, parseInt(yearEl.value))
        if(warn) {
            warningText.style = 'color: var(--hint-color);';
            warningText.innerText = "Внимание: в расписании обнаружены пары, длящиеся не весь семестр, но в "
                + "экспортированном расписании они будут длиться столько же, сколько и все остальные пары."
        }
        const arr = new TextEncoder('utf-8').encode(str)
        const blob = new Blob([arr], { type: 'text/calendar' })

        download(blob, params.filename)

        try { try {
            updateUserdataF('regDocumentUsed')(...params.userdata, 'cld')
        } catch(e) { console.error(e) } } catch(e) {}
    }
    catch(e) {
        try { try {
             updateUserdataF('regDocumentUseError')(...params.userdata, 'cld')
        } catch(e) { console.error(e) } } catch(e) {}
        warningText.style = 'color: var(--error-color);';
        warningText.innerText = 'Ошибка: ' + e;
        console.error(e)
    }
}


function dateToICS(date, absolute) {
    return date.getUTCFullYear().toString().padStart(4, '0') + (date.getUTCMonth()+1).toString().padStart(2, '0')
        + date.getUTCDate().toString().padStart(2, '0') + 'T' + date.getUTCHours().toString().padStart(2, '0')
        + date.getUTCMinutes().toString().padStart(2, '0') + date.getUTCSeconds().toString().padStart(2, '0')
        + (absolute ? 'Z' : '')
}

function scheduleToICS(schedule, dayNames, year) {
    const warnRegex = /\d+?\sнед..*?\d+?/

    let warn = false
    let ics = ''

    function line(str) {
        //TODO: 75 bytes limit to be standard-compliant
        ics += str + '\r\n'
    }

    line('BEGIN:VCALENDAR')
    line('VERSION:2.0')
    line('PRODID:-//Bob//grouptimetable.github.io//EN')
    line('CALSCALE:GREGORIAN')
    line('METHOD:PUBLISH')
    //some of these will hopefully work
    line('X-WR-TIMEZONE:/Europe/Moscow')
    line('X-LIC-LOCATION:/Europe/Moscow')
    line('TZID:/Europe/Moscow')

    const now = dateToICS(new Date(), true)

    function addLesson(date, time, summary, uid) {
        if(!warn && summary.match(warnRegex)) warn = true;

        const match = time.match(/(\d\d):(\d\d)/)

        date = new Date(date)
        date.setUTCHours(parseInt(match[1]), parseInt(match[2]))

        line('BEGIN:VEVENT')
        line('DTSTART;TZID=/Europe/Moscow:' + dateToICS(date))
        line('CREATED:' + now)
        line('DTSTAMP:' + now)
        line('UID:' + uid + '@grouptimetable.github.io')
        line('SEQUENCE:0')
        line('STATUS:CONFIRMED')
        line('SUMMARY:' + summary)
        line('END:VEVENT')
    }

    for(let i = 0; i < schedule.length; i++) {
        const day = schedule[i]
        const match = dayNames[i].match(/(\d\d)\.(\d\d)/)
        const date = new Date(Date.UTC(year, parseInt(match[2]) - 1, parseInt(match[1])))

        for(let j = 0; day && j < day.length; j++) {
            const lesson = day[j]
            const l1 = lesson.lessons[0]
            if(l1.trim() !== '') addLesson(
                date, lesson.time, l1,
                'D'+i+'L'+j+'G'+'T'+0,
            )
        }
    }

    line('END:VCALENDAR')

    return [ics, warn]
}
