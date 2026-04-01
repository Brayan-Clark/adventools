export type Language = 'Français' | 'English' | 'Malagasy' | 'Deutsch' | 'Español' | 'Português' | '中文';

export interface TranslationSchema {
  // General
  settings: string;
  ok: string;
  cancel: string;
  loading: string;
  save: string;
  finish: string;
  apply: string;
  error: string;
  delete: string;
  info: string;
  copy: string;
  success: string;

  // Home Page
  home: string;
  welcome: string;
  verse_of_the_day: string;
  tools: string;
  bible: string;
  hymns: string;
  notes: string;
  pdf_reader: string;
  books: string;
  beliefs: string;
  holy_bible: string;
  choose_language: string;
  install_other_versions: string;
  search_book: string;
  search_text: string;
  verses_tab: string;
  results_found: string;
  searching_bible: string;
  min_search_chars: string;
  no_verse_found: string;
  old_testament_french: string;
  old_testament_malagasy: string;
  new_testament_french: string;
  new_testament_malagasy: string;
  deuterocanonical_other: string;
  other_testament: string;

  // Greetings
  greeting_morning: string;
  greeting_afternoon: string;
  greeting_evening: string;
  greeting_generic: string;

  // Home Features Subtitles
  bible_subtitle: string;
  hymns_subtitle: string;
  pdf_subtitle: string;
  notes_subtitle: string;
  beliefs_subtitle: string;
  useful_subtitle: string;

  // Generic Search/Results
  search_placeholder: string;
  results_count: string;
  no_results: string;

  // Hymnal
  my_hymnals: string;
  manage_local_songs: string;
  store: string;
  integrated_hymnal: string;
  no_hymnal_found: string;
  go_to_store: string;
  default_hymnal_name: string;
  delete_hymnal: string;
  delete_hymnal_data_warning: string;
  keep_my_data: string;
  delete_all: string;
  action_impossible: string;
  cannot_delete_default_hymnal: string;
  search_hymns_placeholder: string;
  search_hymns_basic: string;
  favorites: string;
  no_hymn_found: string;
  quick_search: string;
  enter_hymn_number: string;
  go_to_hymn: string;
  hymn_number: string;
  hymn_key: string;
  praise: string;
  author: string;
  save_corrections: string;
  exported_to_clipboard: string;

  // Library / PDF
  library: string;
  manage_study_resources: string;
  recents: string;
  history: string;
  my_folders: string;
  empty_library: string;
  explore_catalog: string;
  ready_to_read: string;
  cloud_resources: string;
  online_library: string;
  on_device: string;
  cloud: string;
  download_failed: string;
  connection_error: string;
  delete_doc_warning: string;
  keep_my_notes: string;
  delete_doc_success: string;
  delete_doc_error: string;

  // Journal / Notes
  my_journal: string;
  search_note_placeholder: string;
  all_notes: string;
  new_folder: string;
  untitled_note: string;
  study_journal: string;
  no_notes_found: string;
  edit: string;
  folder: string;
  none: string;
  note_title_placeholder: string;
  note_content_placeholder: string;
  new_folder_title: string;
  folder_name_placeholder: string;
  create: string;
  open_in_bible: string;
  delete_note_confirm: string;
  delete_folder_confirm: string;
  folder_exists_error: string;
  verse_not_found_in: string;

  // Utiles / Study Resources
  useful: string;
  more_apps: string;
  recent_read: string;
  empty_history: string;
  study_series: string;
  bible_study_notes: string;
  themes_divers: string;
  notes_and_refs: string;
  verse_not_found: string;
  verse_copied: string;
  ref_copied: string;
  not_found_in_bible: string;
  our_only_credo: string;
  credo_description: string;
  bible_references: string;
  beliefs_28: string;
  faith_foundations: string;
  edit_verse: string;
  add_verse: string;
  edit_theme: string;
  new_theme: string;
  category_selection: string;
  new_category_placeholder: string;
  verse_ref_placeholder: string;
  verse_text_placeholder: string;
  theme_title_placeholder: string;
  theme_verses_placeholder: string;
  bible_long_press_hint: string;
  category_biblical_theme: string;
  categories: string;
  new_verse: string;

  // Verse of the Day
  meditation: string;
  meditation_intro: string;
  verse_loading: string;
  verse_incomplete: string;
  verse_not_found_db: string;
  verse_of_day_footer: string;

  // Study Resources Index
  study_resources: string;
  personal_notes: string;
  study_intro: string;
  folders_header: string;

  // Sabbath School Lessons (Lesona)
  sabbath_school_lessons: string;
  daily_study: string;
  study_series_subtitle: string;
  themes_divers_subtitle: string;
  lesson_number: string;
  check_connection: string;
  maintenance: string;
  clear_history_confirm: string;
  history_cleared: string;
  modify_name: string;
  your_name: string;
  select_class_ss: string;
  select_church_depts: string;
  import_file_selection: string;
  items_to_import: string;
  no_category_selected: string;
  import_success: string;
  import_error: string;
  check_connection_to_view: string;
  download_all: string;
  delete_offline: string;
  confirm_delete_all: string;
  day: string;
  read_today: string;
  no_content: string;
  download_success: string;
  delete_success: string;
  updated: string;
  offline_available: string;
  program_of_study: string;
  source_adventools: string;
  no_cache_available: string;

  // SS Categories
  ss_cat_cradle_roll: string;
  ss_cat_kindergarten: string;
  ss_cat_primary: string;
  ss_cat_junior: string;
  ss_cat_earliteen: string;
  ss_cat_vanguard: string;
  ss_cat_real_time: string;
  ss_cat_young_adult: string;
  ss_cat_adult: string;

  // Settings Page
  tab_general: string;
  tab_reading: string;
  tab_system: string;
  tab_support: string;
  account_group: string;
  edit_name: string;
  eds_class: string;
  my_departments: string;
  pref_group: string;
  dark_mode: string;
  notifications: string;
  language: string;
  add_department: string;
  content_group: string;
  default_bible: string;
  reading_settings: string;
  data_group: string;
  full_backup: string;
  restore_backup: string;
  restore_summary: string;
  export_mods: string;
  import_mods: string;
  reset_hymns: string;
  reset_history: string;
  choose_bible_version: string;
  contact_help_msg: string;
  support_group: string;
  about: string;
  privacy: string;
  donation: string;
  help: string;
  about_title: string;
  privacy_policy: string;
  make_donation: string;
  our_mission: string;
  mission_text: string;
  team_contact: string;
  open_source: string;
  github_contrib: string;
  tech_support: string;
  privacy_status: string;
  privacy_status_text: string;
  made_with_love: string;
  powered_by: string;
  privacy_priority: string;
  local_data: string;
  local_data_text: string;
  zero_collect: string;
  zero_collect_text: string;
  third_party: string;
  third_party_text: string;
  commitment: string;
  commitment_text: string;
  last_update: string;
  support_project: string;
  contribution_diff: string;
  passion_dedication: string;
  small_gesture: string;
  support_methods: string;
  mobile_money: string;
  madagascar_transfer: string;
  online_payment: string;
  payment_methods: string;
  follow_us: string;
  thank_you: string;
  generosity_future: string;

  // Language Management
  manage_languages: string;
  installed_languages: string;
  built_in: string;
  downloaded: string;
  available_cloud: string;
  download: string;

  // Verse Categories (Prayer Promises)
  cat_fanahy_masina: string;
  cat_vavaka: string;
  cat_herin_andriamanitra: string;
  cat_fitarihan_andriamanitra: string;
  cat_fiovam_po: string;
  cat_famela_keloka: string;
  cat_fandresena_ny_fahotana: string;
  cat_fahasitranana: string;
  cat_hery_hanaovana: string;
  cat_maha_vavolombelona: string;

  // Apocrypha testament
  apocrypha_testament: string;
  previous: string;
  next: string;
  end: string;
  bible_verse_info: string;

  // Audio / Praise
  audio_praise: string;
  bible_audio: string;
  bible_studies: string;
  hymns_audio: string;
  fiambenana_maraina: string;
  play: string;
  pause: string;
  delete_audio_confirm: string;
  chapters: string;
  episodes: string;
  file_size: string;
  search_series: string;
  no_episodes_found: string;
  old_testament: string;
  new_testament: string;
  podcasts_streaming: string;
  all_lessons_in_theme: string;
  quarter_number: string;
  all_downloaded: string;
  download_all_confirm: string;
  all: string;
  stored: string;
  online: string;

  // Video
  video: string;
  video_subtitle: string;
  video_and_tv: string;
  video_description: string;
  live_tv: string;
  gospel_songs: string;
  video_bible_studies: string;
  details_video: string;
  video_source_info: string;
  loading_stream: string;
  search_video: string;
  no_video_found: string;
}

export type TranslationKey = keyof TranslationSchema;
