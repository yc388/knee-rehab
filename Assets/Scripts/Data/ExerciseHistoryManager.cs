using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;

namespace KneeRehab.Data
{
    /// <summary>
    /// Saves and loads completed sessions as a JSON file under
    /// Application.persistentDataPath (survives app restarts; per-user, per-device).
    ///
    /// Persistent singleton MonoBehaviour. ATTACH TO: a GameObject named
    /// "HistoryManager" in the main scene (SceneBuilder creates it).
    ///
    /// Later this file could be uploaded to a server / cloud; the public API here
    /// (AddSession / GetSessions) would not need to change.
    /// </summary>
    public class ExerciseHistoryManager : MonoBehaviour
    {
        public static ExerciseHistoryManager Instance { get; private set; }

        private const string FileName = "exercise_history.json";

        private ExerciseHistoryFile _data = new ExerciseHistoryFile();

        /// <summary>Raised whenever the history changes so UI can refresh.</summary>
        public event Action HistoryChanged;

        private string FilePath => Path.Combine(Application.persistentDataPath, FileName);

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            Load();
        }

        public void Load()
        {
            try
            {
                if (File.Exists(FilePath))
                {
                    string json = File.ReadAllText(FilePath);
                    _data = JsonUtility.FromJson<ExerciseHistoryFile>(json) ?? new ExerciseHistoryFile();
                }
                else
                {
                    _data = new ExerciseHistoryFile();
                }
            }
            catch (Exception e)
            {
                Debug.LogError($"[ExerciseHistoryManager] Failed to load history: {e.Message}");
                _data = new ExerciseHistoryFile();
            }
        }

        public void Save()
        {
            try
            {
                string json = JsonUtility.ToJson(_data, prettyPrint: true);
                File.WriteAllText(FilePath, json);
            }
            catch (Exception e)
            {
                Debug.LogError($"[ExerciseHistoryManager] Failed to save history: {e.Message}");
            }
        }

        public void AddSession(ExerciseSession session)
        {
            if (session == null) return;
            _data.sessions.Add(session);
            Save();
            HistoryChanged?.Invoke();
        }

        /// <summary>All sessions, newest first.</summary>
        public List<ExerciseSession> GetSessions()
        {
            var list = new List<ExerciseSession>(_data.sessions);
            list.Sort((a, b) => b.Date.CompareTo(a.Date));
            return list;
        }

        /// <summary>Sessions for a given calendar day (local time).</summary>
        public List<ExerciseSession> GetSessionsForDay(DateTime day)
        {
            var result = new List<ExerciseSession>();
            foreach (var s in _data.sessions)
                if (s.Date.ToLocalTime().Date == day.Date)
                    result.Add(s);
            return result;
        }

        public ExerciseSession MostRecent()
        {
            ExerciseSession best = null;
            foreach (var s in _data.sessions)
                if (best == null || s.Date > best.Date) best = s;
            return best;
        }

        /// <summary>Today's completed-exercise count and total duration (seconds).</summary>
        public (int count, float totalSeconds) TodaySummary()
        {
            int count = 0;
            float seconds = 0f;
            var today = DateTime.Now.Date;
            foreach (var s in _data.sessions)
            {
                if (s.Date.ToLocalTime().Date == today)
                {
                    count++;
                    seconds += s.durationSeconds;
                }
            }
            return (count, seconds);
        }

        public void ClearAll()
        {
            _data = new ExerciseHistoryFile();
            Save();
            HistoryChanged?.Invoke();
        }
    }
}
