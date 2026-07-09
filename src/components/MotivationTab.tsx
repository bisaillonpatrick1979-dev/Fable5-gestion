import React, { useState } from 'react';
import useAppStore, { getXPRequiredForLevel, getLevelFromXP } from '../store';
import { MotivationTeam, MotivationGoal, Employee, Project } from '../types';
import { Trophy, Users, PlusCircle, Trash, Award, Flame, UserCheck, CheckSquare, ShieldCheck, Zap, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmployeeAvatar from './EmployeeAvatar';

export default function MotivationTab() {
  const {
    employees,
    projects,
    punchSessions,
    motivationTeams,
    motivationGoals,
    weeklyGoals,
    currentLanguage,
    activeEmployee,
    addMotivationTeam,
    updateMotivationTeam,
    deleteMotivationTeam,
    addMotivationGoal,
    updateMotivationGoal,
    deleteMotivationGoal,
    manualProgressGoal,
    recomputeGoalsAndStreaks
  } = useAppStore();

  const isFrench = currentLanguage === 'FR';

  // State for forms
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState('#06b6d4'); // default cyan
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [teamLeader, setTeamLeader] = useState('');
  const [teamProjects, setTeamProjects] = useState<string[]>([]);

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalScope, setGoalScope] = useState<'company' | 'team' | 'individual'>('company');
  const [goalMetric, setGoalMetric] = useState<'revenue' | 'hours' | 'jobs_completed' | 'checklist_done' | 'safety_days' | 'custom'>('revenue');
  const [goalTarget, setGoalTarget] = useState(1000);
  const [goalRewardType, setGoalRewardType] = useState<'lunch' | 'draw' | 'bonus' | 'gift' | 'trip' | 'custom'>('lunch');
  const [goalRewardTitle, setGoalRewardTitle] = useState('');
  const [goalRewardDesc, setGoalRewardDesc] = useState('');
  const [goalTeamId, setGoalTeamId] = useState('');
  const [goalEmployeeId, setGoalEmployeeId] = useState('');

  // Celebration state for feedback
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebratedReward, setCelebratedReward] = useState('');

  const triggerCelebration = (rewardTitle: string) => {
    setCelebratedReward(rewardTitle);
    setShowConfetti(true);
    setTimeout(() => {
      setShowConfetti(false);
    }, 4000);
  };

  // Level Titles Helper
  const getLevelTitle = (level: number) => {
    const titlesFR = [
      "Nouvelle Recrue",
      "Apprenti",
      "Ouvrier Qualifié",
      "Chef d'Équipe",
      "Contremaître",
      "Surintendant",
      "Maître de Chantier"
    ];
    const titlesEN = [
      "New Hire",
      "Apprentice",
      "Skilled Worker",
      "Team Leader",
      "Foreman",
      "Superintendent",
      "Master Builder"
    ];
    const idx = Math.min(Math.max(1, level), 7) - 1;
    return isFrench ? titlesFR[idx] : titlesEN[idx];
  };

  // Submit new team
  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    addMotivationTeam({
      name: teamName,
      memberIds: teamMembers,
      color: teamColor,
      active: true,
      leaderId: teamLeader || undefined,
      projectIds: teamProjects.length > 0 ? teamProjects : undefined
    });
    setTeamName('');
    setTeamMembers([]);
    setTeamLeader('');
    setTeamProjects([]);
    setShowTeamForm(false);
    alert(isFrench ? "Équipe créée avec succès !" : "Team created successfully!");
  };

  // Submit new goal
  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim() || !goalRewardTitle.trim()) return;
    addMotivationGoal({
      title: goalTitle,
      scope: goalScope,
      metric: goalMetric,
      target: Number(goalTarget),
      current: 0,
      rewardType: goalRewardType,
      rewardTitle: goalRewardTitle,
      rewardDescription: goalRewardDesc || undefined,
      status: 'active',
      teamId: goalScope === 'team' ? goalTeamId : undefined,
      employeeId: goalScope === 'individual' ? goalEmployeeId : undefined
    });
    setGoalTitle('');
    setGoalRewardTitle('');
    setGoalRewardDesc('');
    setGoalTarget(1000);
    setShowGoalForm(false);
    alert(isFrench ? "Objectif de motivation créé avec succès !" : "Motivation goal created successfully!");
  };

  // Calculate live team overview metrics
  const getTeamStats = (team: MotivationTeam) => {
    const activePunches = punchSessions.filter(p => p.endTime === null && team.memberIds.includes(p.employeeId));
    
    // Total hours and revenues from finished or running sessions today (YYYY-MM-DD format)
    const todayStr = new Date().toISOString().split('T')[0];
    const teamPunches = punchSessions.filter(p => team.memberIds.includes(p.employeeId));
    
    const activeHours = teamPunches.reduce((sum, p) => sum + (p.totalWorkedHours || 0), 0);
    const totalRevenue = teamPunches.reduce((sum, p) => sum + (p.revenue || 0), 0);

    return {
      onSiteCount: activePunches.length,
      activeHours: Number(activeHours.toFixed(1)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      activeProjectNames: activePunches.length > 0 
        ? Array.from(new Set(activePunches.map(p => p.projectName))).join(', ')
        : (isFrench ? 'Aucun' : 'None')
    };
  };

  // Leaderboard data
  // Group employee metrics (this week)
  const workerLeaderboard = employees
    .filter(e => e.role !== 'admin')
    .map(emp => {
      const empPunches = punchSessions.filter(p => p.employeeId === emp.id);
      const totalHours = empPunches.reduce((sum, p) => sum + (p.totalWorkedHours || 0), 0);
      const totalRevenue = empPunches.reduce((sum, p) => sum + (p.revenue || 0), 0);
      return {
        employee: emp,
        hours: Number(totalHours.toFixed(1)),
        revenue: Number(totalRevenue.toFixed(2)),
        xpPoints: emp.xp,
        level: emp.level
      };
    })
    .sort((a, b) => b.revenue - a.revenue); // sort by revenue descending

  return (
    <div id="view-motivation-content" className="bg-[#16191F] border border-gray-800 rounded-2xl p-6 flex flex-col gap-6 text-xs text-gray-300 relative">
      
      {/* Dynamic Celebration Confetti Particle Overlay */}
      {showConfetti && (
        <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/60 rounded-2xl backdrop-blur-sm animate-fade-in">
          <div className="text-center p-6 bg-gray-900 border-2 border-yellow-500 rounded-3xl shadow-2xl max-w-sm space-y-4 animate-bounce">
            <span className="text-6xl animate-pulse">🏆🎉💥👑</span>
            <h4 className="text-xl font-extrabold text-yellow-400">
              {isFrench ? "OBJECTIF ATTEINT !" : "GOAL ACHIEVED!"}
            </h4>
            <p className="text-sm font-semibold text-white uppercase tracking-wider bg-yellow-500/10 px-4 py-2 rounded-xl border border-yellow-500/30">
              {celebratedReward}
            </p>
            <p className="text-[11px] text-gray-400">
              {isFrench ? "Félicitations à toute l'équipe de Votre Entreprise !" : "Congratulations to the whole Votre Entreprise team!"}
            </p>
          </div>
          {/* Mock micro confettis */}
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 35 }).map((_, i) => (
              <div 
                key={i}
                className="absolute w-2.5 h-2.5 rounded-full"
                style={{
                  top: `${Math.random() * 80 + 10}%`,
                  left: `${Math.random() * 90 + 5}%`,
                  backgroundColor: ['#eab308', '#2563eb', '#ec4899', '#10b981', '#f97316'][Math.floor(Math.random() * 5)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                  animation: `ping ${1 + Math.random() * 2}s infinity ease-in`
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Header with Title and XP Badge */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-850 pb-4">
        <div>
          <h3 className="text-xl font-black text-white flex items-center gap-2">
            <Trophy className="text-yellow-500 w-6 h-6 animate-pulse" />
            {isFrench ? "Système de Motivation & Équipes" : "Motivation & Team System"}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {isFrench 
              ? "Suivez les objectifs, gérez les équipes de Votre Entreprise et distribuez les récompenses de chantiers." 
              : "Track goals, manage Votre Entreprise team structures, and distribute real site rewards."}
          </p>
        </div>
        
        <div className="flex gap-2">
          {activeEmployee?.role === 'admin' && (
            <>
              <button
                onClick={() => setShowTeamForm(!showTeamForm)}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-white rounded-xl transition cursor-pointer"
              >
                <Users className="w-4 h-4 text-orange-500" />
                <span>{isFrench ? "Créer une Équipe" : "Create Team"}</span>
              </button>
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isFrench ? "Créer un Objectif" : "Create Goal"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Create Team Form Modal / State */}
      <AnimatePresence>
        {showTeamForm && (
          <motion.form 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreateTeam}
            className="p-4 bg-gray-950 border border-gray-850 rounded-2xl flex flex-col gap-4 animate-fade-in"
          >
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-white text-xs">{isFrench ? "NOUVELLE ÉQUIPE" : "NEW TEAM"}</h4>
              <button type="button" onClick={() => setShowTeamForm(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Nom de l'équipe" : "Team Name"}</label>
                <input 
                  type="text" 
                  value={teamName} 
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder={isFrench ? "ex: Poseurs d'Acier Élite" : "e.g. Steel Crew Élite"}
                  className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Couleur du badge" : "Badge Color"}</label>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {['#06b6d4', '#a855f7', '#10b981', '#f97316', '#ec4899', '#3b82f6'].map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setTeamColor(col)}
                      className={`w-6 h-6 rounded-full border transition-all ${teamColor === col ? 'border-white scale-110 ring-2 ring-orange-500/50' : 'border-transparent'}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Leader d'équipe" : "Team Leader"}</label>
                <select
                  value={teamLeader}
                  onChange={(e) => setTeamLeader(e.target.value)}
                  className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                >
                  <option value="">-- {isFrench ? "Sélectionner" : "Select"} --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.workerType})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-gray-400 font-bold block mb-2">{isFrench ? "Membres de l'équipe" : "Team Members"}</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 p-2 bg-gray-900 hover:bg-gray-850 rounded-lg border border-gray-850 cursor-pointer text-white">
                    <input 
                      type="checkbox"
                      checked={teamMembers.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTeamMembers([...teamMembers, emp.id]);
                        } else {
                          setTeamMembers(teamMembers.filter(id => id !== emp.id));
                        }
                      }}
                      className="accent-orange-500"
                    />
                    <span className="truncate">{emp.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-850">
              <button 
                type="button" 
                onClick={() => setShowTeamForm(false)} 
                className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-300 hover:bg-gray-850"
              >
                {isFrench ? "Annuler" : "Cancel"}
              </button>
              <button 
                type="submit" 
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg"
              >
                {isFrench ? "Créer l'Équipe" : "Create Team"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Create Motivation Goal Form Modal */}
      <AnimatePresence>
        {showGoalForm && (
          <motion.form 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleCreateGoal}
            className="p-4 bg-gray-950 border border-gray-850 rounded-2xl flex flex-col gap-4 animate-fade-in"
          >
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-white text-xs">{isFrench ? "NOUVEL OBJECTIF DE MOTIVATION" : "NEW MOTIVATION GOAL"}</h4>
              <button type="button" onClick={() => setShowGoalForm(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Titre de l'objectif" : "Goal Title"}</label>
                <input 
                  type="text" 
                  value={goalTitle} 
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder={isFrench ? "ex: Toiture Parfaite du Mois" : "ex: Top Quality Roof Goal"}
                  className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Portée (Scope)" : "Scope"}</label>
                <select
                  value={goalScope}
                  onChange={(e) => setGoalScope(e.target.value as any)}
                  className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                >
                  <option value="company">{isFrench ? "Entreprise globale" : "Company-wide"}</option>
                  <option value="team">{isFrench ? "Par Équipe" : "By Team"}</option>
                  <option value="individual">{isFrench ? "Individuel" : "Individual"}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Métrique de punch" : "Punch Metric"}</label>
                <select
                  value={goalMetric}
                  onChange={(e) => setGoalMetric(e.target.value as any)}
                  className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                >
                  <option value="revenue">{isFrench ? "Revenus accumulés ($)" : "Accumulated Revenue ($)"}</option>
                  <option value="hours">{isFrench ? "Heures de chantier cumulées" : "Accumulated hours"}</option>
                  <option value="jobs_completed">{isFrench ? "Punches / Chantiers terminés" : "Completed sessions"}</option>
                  <option value="checklist_done">{isFrench ? "Matériaux installés (Cheklists)" : "Checklist items done"}</option>
                  <option value="safety_days">{isFrench ? "Jours de chantier sans encombre GPS" : "Safe GPS check days"}</option>
                  <option value="custom">{isFrench ? "Métrique personnalisée" : "Custom metric"}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Cible à atteindre" : "Target"}</label>
                <input 
                  type="number" 
                  value={goalTarget} 
                  onChange={(e) => setGoalTarget(Number(e.target.value))}
                  className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {goalScope === 'team' && (
                <div>
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Équipe ciblée" : "Target Team"}</label>
                  <select
                    value={goalTeamId}
                    onChange={(e) => setGoalTeamId(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                    required
                  >
                    <option value="">-- {isFrench ? "Sélectionner" : "Select"} --</option>
                    {motivationTeams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {goalScope === 'individual' && (
                <div>
                  <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Employé ciblé" : "Target Employee"}</label>
                  <select
                    value={goalEmployeeId}
                    onChange={(e) => setGoalEmployeeId(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                    required
                  >
                    <option value="">-- {isFrench ? "Sélectionner" : "Select"} --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Type de récompense" : "Reward Type"}</label>
                <select
                  value={goalRewardType}
                  onChange={(e) => setGoalRewardType(e.target.value as any)}
                  className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                >
                  <option value="lunch">{isFrench ? "Dîner d'équipe" : "Team Lunch"}</option>
                  <option value="bonus">{isFrench ? "Prime / Bonus" : "Financial Bonus"}</option>
                  <option value="gift">{isFrench ? "Cadeau matériel" : "Gift / Merch"}</option>
                  <option value="draw">{isFrench ? "Tirage au sort" : "Raffle / Draw"}</option>
                  <option value="trip">{isFrench ? "Voyage ou congé payé" : "Trip / Paid vacation"}</option>
                  <option value="custom">{isFrench ? "Autre récompense" : "Custom reward"}</option>
                </select>
              </div>

              <div className="md:col-span-1">
                <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Titre Récompense" : "Reward Title"}</label>
                <input 
                  type="text" 
                  value={goalRewardTitle} 
                  onChange={(e) => setGoalRewardTitle(e.target.value)}
                  placeholder={isFrench ? "ex: Dîner de homards payé" : "ex: Free Lobster Feast"}
                  className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase text-gray-400 font-bold">{isFrench ? "Description / Notes de la récompense" : "Reward details"}</label>
              <textarea
                value={goalRewardDesc}
                onChange={(e) => setGoalRewardDesc(e.target.value)}
                placeholder={isFrench ? "Précisez les conditions ou le lieu de la récompense." : "Describe the details or terms of the incentive."}
                className="w-full mt-1.5 p-2 bg-gray-900 border border-gray-800 rounded-lg text-white text-xs h-16"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-850">
              <button 
                type="button" 
                onClick={() => setShowGoalForm(false)} 
                className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-300"
              >
                {isFrench ? "Annuler" : "Cancel"}
              </button>
              <button 
                type="submit" 
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg"
              >
                {isFrench ? "Créer l'Objectif" : "Create Goal"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Grid: Goals Listing & Teams Listing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Objectives list with progress - 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          <h4 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-850">
            <Award className="w-4 h-4 text-orange-500" />
            {isFrench ? "Cibles actives & Progression" : "Active goals & Progression"}
          </h4>

          <div className="space-y-4">
            {motivationGoals.length === 0 ? (
              <p className="text-gray-500 text-center py-6">{isFrench ? "Aucun objectif de motivation pour le moment." : "No active goals currently."}</p>
            ) : (
              motivationGoals.map(goal => {
                const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100)) || 0;
                const isAchieved = goal.status === 'achieved';
                
                return (
                  <div 
                    key={goal.id} 
                    className={`p-4 rounded-xl border relative transition-all ${
                      isAchieved 
                        ? 'bg-yellow-500/5 border-yellow-500/30' 
                        : 'bg-gray-900/50 border-gray-850 hover:bg-gray-900'
                    }`}
                  >
                    {isAchieved && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-yellow-500 text-black animate-pulse">
                        🏆 {isFrench ? "CONQUIS !" : "ACHIEVED!"}
                      </span>
                    )}

                    <div className="pr-20">
                      <span className="text-[9px] uppercase tracking-wider font-mono font-black text-gray-500">
                        Scope: {goal.scope.toUpperCase()} — Metric: {goal.metric.toUpperCase()}
                      </span>
                      <h5 className="font-extrabold text-white text-sm mt-1">{goal.title}</h5>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {isFrench ? "Cible : " : "Target: "} <span className="text-white font-bold">{goal.target}</span> | 
                        {isFrench ? " Actuel : " : " Current: "} <span className="text-orange-400 font-bold">{goal.current}</span>
                      </p>
                    </div>

                    {/* Progress Bar cyan/purple or yellow */}
                    <div className="mt-3">
                      <div className="h-2.5 bg-gray-950 rounded-full overflow-hidden border border-gray-850">
                        <div 
                          className={`h-full transition-all duration-1000 bg-gradient-to-r ${
                            isAchieved 
                              ? 'from-yellow-500 to-amber-400' 
                              : 'from-cyan-500 to-purple-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1.5">
                        <span>{percentage}%</span>
                        <span className="font-bold text-gray-300">
                          {isFrench ? "Récompense : " : "Reward: "} 🎁 {goal.rewardTitle}
                        </span>
                      </div>
                    </div>

                    {goal.rewardDescription && (
                      <p className="mt-2 text-[10px] text-gray-400 bg-gray-950/40 p-2 rounded border border-gray-850 font-mono">
                        📝 {goal.rewardDescription}
                      </p>
                    )}

                    {/* Manual Progression button adjustment adjustments */}
                    {activeEmployee?.role === 'admin' && (
                      <div className="mt-4 pt-3 border-t border-gray-850 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 uppercase tracking-wider font-mono">{isFrench ? "Ajustement Manuel :" : "Adjust :"}</span>
                          <div className="flex gap-1 bg-gray-950 p-1 rounded-lg border border-gray-850 font-mono">
                            {[-1000, -100, -10, -1, 1, 10, 100, 1000].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => {
                                  manualProgressGoal(goal.id, val);
                                  // If achieved after click, trigger local celebrate
                                  const updatedG = useAppStore.getState().motivationGoals.find(g => g.id === goal.id);
                                  if (updatedG && updatedG.status === 'achieved') {
                                    triggerCelebration(updatedG.rewardTitle);
                                  }
                                }}
                                className={`px-1 py-0.5 rounded text-[9px] cursor-pointer hover:bg-gray-850 ${val > 0 ? 'text-green-400' : 'text-red-400'}`}
                              >
                                {val > 0 ? `+${val}` : val}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(isFrench ? "Supprimer cet objectif ?" : "Delete this goal?")) {
                              deleteMotivationGoal(goal.id);
                            }
                          }}
                          className="p-1 px-2.5 rounded bg-red-600/10 text-red-400 hover:bg-red-600/25 border border-red-500/20"
                        >
                          <Trash className="w-3.5 h-3.5 cursor-pointer" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Teams list with live stats - 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          <h4 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-850">
            <Users className="w-4 h-4 text-orange-500" />
            {isFrench ? "Équipes & Contrôle Chantiers" : "Teams & Field Monitor"}
          </h4>

          <div className="space-y-4">
            {motivationTeams.length === 0 ? (
              <p className="text-gray-500 text-center py-6">{isFrench ? "Aucune équipe créée." : "No teams drafted."}</p>
            ) : (
              motivationTeams.map(team => {
                const stats = getTeamStats(team);
                const leaderObj = employees.find(e => e.id === team.leaderId);

                return (
                  <div key={team.id} className="p-4 bg-gray-900/60 border border-gray-850 rounded-xl relative overflow-hidden flex flex-col gap-3">
                    {/* Color dot left banner edge */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: team.color }} />

                    <div className="flex justify-between items-start pl-2">
                      <div>
                        <h5 className="font-extrabold text-white text-sm">{team.name}</h5>
                        {leaderObj && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            👑 Chef : <span className="text-orange-400 font-bold">{leaderObj.name}</span>
                          </p>
                        )}
                      </div>
                      
                      {activeEmployee?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(isFrench ? "Supprimer cette équipe ?" : "Delete this team?")) {
                              deleteMotivationTeam(team.id);
                            }
                          }}
                          className="text-gray-500 hover:text-red-400 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Member Avatars */}
                    <div className="flex items-center gap-1 flex-wrap pl-2">
                      {team.memberIds.map(mId => {
                        const m = employees.find(e => e.id === mId);
                        if (!m) return null;
                        return (
                          <div 
                            key={mId} 
                            className="bg-gray-950 p-1 px-2 rounded-lg border border-gray-850 flex items-center gap-1.5"
                          >
                            <EmployeeAvatar src={m.avatar} name={m.name} className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-[10px] text-gray-300 pr-1">{m.name}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Live Stats */}
                    <div className="pl-2 mt-2 pt-2 border-t border-gray-850/50 grid grid-cols-3 gap-2.5 text-center font-mono text-xs">
                      <div className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-850">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">Membres On-Site</span>
                        <span className={`text-sm font-black ${stats.onSiteCount > 0 ? 'text-green-400 animate-pulse' : 'text-gray-400'}`}>
                          🟢 {stats.onSiteCount} / {team.memberIds.length}
                        </span>
                      </div>
                      <div className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-850">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">Heures Totales</span>
                        <span className="text-sm font-black text-white">
                          ⏱️ {stats.activeHours}h
                        </span>
                      </div>
                      <div className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-850">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block mb-1">Revenus</span>
                        <span className="text-sm font-black text-orange-400">
                          💰 {stats.totalRevenue}$
                        </span>
                      </div>
                    </div>

                    <div className="pl-2 flex items-center justify-between text-xs text-gray-400 font-mono">
                      <span className="font-bold">🔨 Chantier :</span>
                      <span className="text-white font-black truncate max-w-[150px]">{stats.activeProjectNames}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Leaderboard Section (Visible admin only) */}
      {activeEmployee?.role === 'admin' && (
        <div className="mt-4 p-5 bg-[#1C2028] border border-gray-800 rounded-2xl flex flex-col gap-4 animate-fade-in">
          <div>
            <h4 className="text-xs font-black uppercase text-orange-500 tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-850">
              <Flame className="w-4 h-4 text-orange-500" />
              {isFrench ? "Tableau d'Honneur de Votre Entreprise" : "Votre Entreprise Leaderboard"}
            </h4>
            <p className="text-[11px] text-gray-400 mt-1">
              Classé par revenus de punch de la semaine. Encouragez les membres à compléter les chantiers !
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: Employee Podium ranking */}
            <div className="space-y-3">
              <h5 className="font-bold text-white text-xs">{isFrench ? "🏆 Classement Individuel" : "🏆 Individual Standings"}</h5>
              
              <div className="space-y-2">
                {workerLeaderboard.map((row, index) => {
                  let medal = '';
                  let bgCol = 'bg-gray-900 border-gray-850';
                  if (index === 0) {
                    medal = '🥇';
                    bgCol = 'bg-yellow-500/5 border-yellow-500/20';
                  } else if (index === 1) {
                    medal = '🥈';
                    bgCol = 'bg-gray-300/5 border-gray-300/20';
                  } else if (index === 2) {
                    medal = '🥉';
                    bgCol = 'bg-amber-700/5 border-amber-700/20';
                  }

                  return (
                    <div 
                      key={row.employee.id} 
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs transition-colors ${bgCol}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm text-gray-500 font-mono w-4">{medal || `${index + 1}`}</span>
                        <EmployeeAvatar src={row.employee.avatar} name={row.employee.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <h6 className="font-bold text-white flex items-center gap-1.5">
                            {row.employee.name}
                            <span className="text-[9px] bg-orange-600/15 text-orange-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">
                              Lvl {row.employee.level}
                            </span>
                          </h6>
                          <p className="text-[10px] text-gray-400">
                            {getLevelTitle(row.employee.level)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="font-bold text-orange-400 text-sm block">{row.revenue}$</span>
                        <span className="text-gray-500 text-[10px]">{row.hours}h de punch</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Team score visualizer */}
            <div className="space-y-3">
              <h5 className="font-bold text-white text-xs">{isFrench ? "📊 Chiffres d'Affaires VS Objectif" : "📊 Team Revenues VS Objectives"}</h5>
              
              <div className="space-y-4">
                {motivationTeams.map(team => {
                  const stats = getTeamStats(team);
                  
                  // Find related team scope revenue goal
                  const relativeGoal = motivationGoals.find(g => g.scope === 'team' && g.teamId === team.id && g.metric === 'revenue');
                  const targetRev = relativeGoal ? relativeGoal.target : 12000; // default benchmark
                  const percent = Math.min(100, Math.round((stats.totalRevenue / targetRev) * 100));

                  return (
                    <div key={team.id} className="p-3.5 bg-gray-900 border border-gray-850 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-white">{team.name}</span>
                        <span className="font-mono text-gray-400">
                          {stats.totalRevenue}$ / <span className="text-gray-500">{targetRev}$</span>
                        </span>
                      </div>

                      <div className="h-2 bg-gray-950 rounded-full overflow-hidden border border-gray-850">
                        <div 
                          className="h-full rounded-full transition-all duration-1000" 
                          style={{ 
                            width: `${percent}%`, 
                            backgroundColor: team.color 
                          }}
                        />
                      </div>
                      
                      <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                        <span>{percent}% complété</span>
                        <span>{isFrench ? "Membres actifs : " : "Active : "} {stats.onSiteCount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
