const CONFIG = {
    APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyvxPCCJFv6QdD9BKsb2_DiL0UJG0wAQwlrHACafSP4BZhj7Z9Ilm13F9feeDxUMb0_IQ/exec',
    REKAP_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby6jn7djxi1VCPWeXjwr4nILG9gxIRS-L4W3UdOijfDvELXLr_iEenZFIrQ729ygKO0/exec',
    PEGAWAI_JSON_URL: 'data/pegawai.json',
    TURNSTILE_SITE_KEY: '0x4AAAAAAEbv35t8ZxqHp11-',
    PRESENSI_MODE: 'REGULAR',
    PRESENSI_OPTIONS: {
        REGULAR: {
            NORMAL: { offsetHours: 8, offsetMinutes: 30, minimumHour: 16, minimumMinute: 0 },
            FRIDAY: { offsetHours: 9, offsetMinutes: 0, minimumHour: 16, minimumMinute: 30 }
        },
        RAMADHAN: {
            NORMAL: { offsetHours: 7, offsetMinutes: 0, minimumHour: 15, minimumMinute: 0 },
            FRIDAY: { offsetHours: 7, offsetMinutes: 30, minimumHour: 15, minimumMinute: 30 }
        }
    },
    MAP_DEFAULT_ZOOM: 16,
    GEOLOCATION_TIMEOUT: 10000
};
