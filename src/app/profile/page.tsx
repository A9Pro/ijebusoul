"use client";
import { useState } from "react";
import BottomNav from "@/components/BottomNav";

const PHOTOS    = [{ bg:"#FFDEE9",emoji:"🌺" },{ bg:"#D0E8FF",emoji:"🏖️" },{ bg:"#D1FAE5",emoji:"🍲" },{ bg:"#FEF3C7",emoji:"🎉" },{ bg:"#EDE9FF",emoji:"🌙" },{ bg:"#FFE4CC",emoji:"🎶" }];
const INTERESTS = ["Suya lover","Owanbe ready","AFC Ijebu","Egusi connoisseur","Owambe DJ","Yoruba culture"];
const STATS     = [{ label:"Matches",value:"24" },{ label:"Likes received",value:"138" },{ label:"Profile views",value:"312" }];

type Profile = { name:string; age:string; location:string; bio:string; occupation:string; interests:string[] };

export default function ProfilePage() {
  const [editing, setEditing]     = useState(false);
  const [activeTab, setActiveTab] = useState<"photos"|"about"|"activity">("photos");
  const [profile, setProfile]     = useState<Profile>({ name:"Adunola", age:"27", location:"Ijebu Ode", bio:"Ijebu girl 🌸 Lover of egusi soup, owambe life, and good conversation. Looking for someone who knows the way to Ijebu Ode 😄", occupation:"Brand Strategist", interests:[...INTERESTS] });
  const [draft, setDraft]         = useState<Profile>({ ...profile });

  const saveEdit   = () => { setProfile({ ...draft }); setEditing(false); };
  const cancelEdit = () => { setDraft({ ...profile }); setEditing(false); };

  if (editing) return (
    <main style={{ minHeight:"100dvh", maxWidth:430, margin:"0 auto", background:"#0a0a0a", fontFamily:"system-ui, sans-serif", display:"flex", flexDirection:"column", color:"#fff" }}>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"52px 20px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <h1 style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.03em" }}>Edit profile</h1>
        <button onClick={cancelEdit} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:50, padding:"7px 16px", fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.7)", cursor:"pointer" }}>Cancel</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"24px 20px", display:"flex", flexDirection:"column", gap:20 }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
          <div style={{ width:90, height:90, borderRadius:"50%", background:"#FFDEE9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:48, border:"3px solid #D4AF37", position:"relative", cursor:"pointer" }}>
            👩🏾
            <div style={{ position:"absolute", bottom:0, right:0, width:28, height:28, borderRadius:"50%", background:"#D4AF37", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, border:"2px solid #0a0a0a" }}>✏️</div>
          </div>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Tap to change photo</span>
        </div>

        {(["name","age","location","occupation"] as const).map((key) => (
          <div key={key}>
            <label style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:8 }}>{key.charAt(0).toUpperCase()+key.slice(1)}</label>
            <input value={draft[key]} onChange={(e) => setDraft((p) => ({ ...p, [key]:e.target.value }))} style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:12, padding:"11px 14px", color:"#fff", fontSize:14, outline:"none", fontFamily:"system-ui, sans-serif" }} />
          </div>
        ))}

        <div>
          <label style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Bio</label>
          <textarea rows={4} value={draft.bio} onChange={(e) => setDraft((p) => ({ ...p, bio:e.target.value }))} style={{ width:"100%", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:14, padding:"11px 14px", color:"#fff", fontSize:14, outline:"none", resize:"none", lineHeight:1.6, fontFamily:"system-ui, sans-serif" }} />
        </div>

        <div>
          <label style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:12 }}>Interests</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {draft.interests.map((tag, i) => (
              <div key={i} onClick={() => setDraft((p) => ({ ...p, interests:p.interests.filter((_,j) => j!==i) }))} style={{ display:"inline-flex", alignItems:"center", background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.25)", color:"#D4AF37", borderRadius:50, padding:"5px 13px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {tag}<span style={{ marginLeft:6, opacity:.6 }}>×</span>
              </div>
            ))}
            <div style={{ display:"inline-flex", alignItems:"center", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.4)", borderRadius:50, padding:"5px 13px", fontSize:12, fontWeight:600, cursor:"pointer" }}>+ Add</div>
          </div>
        </div>

        <button onClick={saveEdit} style={{ width:"100%", background:"#D4AF37", border:"none", borderRadius:16, padding:16, fontSize:15, fontWeight:800, color:"#000", cursor:"pointer", marginBottom:20 }}>Save changes</button>
      </div>

      <BottomNav />
    </main>
  );

  return (
    <main style={{ minHeight:"100dvh", maxWidth:430, margin:"0 auto", background:"#0a0a0a", fontFamily:"system-ui, sans-serif", display:"flex", flexDirection:"column", color:"#fff" }}>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"52px 20px 16px" }}>
        <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:"-0.03em" }}>My profile</h1>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => { setDraft({ ...profile }); setEditing(true); }} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:50, padding:"8px 16px", fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.7)", cursor:"pointer" }}>✏️ Edit</button>
          <button style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:50, padding:"8px 14px", fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.7)", cursor:"pointer" }}>⚙️</button>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingBottom:20 }}>

        <div style={{ padding:"0 20px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
          <div style={{ position:"relative" }}>
            <div style={{ width:100, height:100, borderRadius:"50%", background:"#FFDEE9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:52, border:"3px solid #D4AF37" }}>👩🏾</div>
            <div style={{ position:"absolute", bottom:3, right:3, width:22, height:22, borderRadius:"50%", background:"#22C55E", border:"2.5px solid #0a0a0a" }} />
          </div>
          <div style={{ textAlign:"center" }}>
            <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.02em" }}>{profile.name}, {profile.age}</h2>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", marginTop:4 }}>📍 {profile.location} · {profile.occupation}</p>
          </div>
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.65)", lineHeight:1.65, textAlign:"center", maxWidth:320 }}>{profile.bio}</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, justifyContent:"center" }}>
            {profile.interests.map((tag,i) => (
              <div key={i} style={{ display:"inline-flex", alignItems:"center", background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.25)", color:"#D4AF37", borderRadius:50, padding:"5px 13px", fontSize:12, fontWeight:600 }}>{tag}</div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", gap:10, padding:"0 20px 24px" }}>
          {STATS.map((s,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:14, padding:"14px 10px", textAlign:"center", flex:1 }}>
              <div style={{ fontSize:22, fontWeight:900, color:"#D4AF37", letterSpacing:"-0.02em" }}>{s.value}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:4, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"0 20px" }}>
          {(["photos","about","activity"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex:1, background:"none", border:"none", color:activeTab===tab?"#D4AF37":"rgba(255,255,255,0.3)", fontSize:13, fontWeight:activeTab===tab?700:500, padding:"10px 0 12px", cursor:"pointer", borderBottom:activeTab===tab?"2px solid #D4AF37":"2px solid transparent", textTransform:"capitalize" }}>{tab}</button>
          ))}
        </div>

        {activeTab==="photos" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, padding:"16px 20px" }}>
            {PHOTOS.map((p,i) => (
              <div key={i} style={{ borderRadius:12, aspectRatio:"1", background:p.bg, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden", cursor:"pointer" }}>
                <span style={{ fontSize:38 }}>{p.emoji}</span>
                {i===0 && <div style={{ position:"absolute", top:6, left:6, background:"#D4AF37", borderRadius:50, padding:"2px 8px", fontSize:10, fontWeight:800, color:"#000" }}>Main</div>}
              </div>
            ))}
            <div style={{ borderRadius:12, aspectRatio:"1", background:"rgba(255,255,255,0.04)", border:"1.5px dashed rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, color:"rgba(255,255,255,0.25)", cursor:"pointer" }}>+</div>
          </div>
        )}

        {activeTab==="about" && (
          <div style={{ padding:"20px" }}>
            {[{icon:"🎂",label:"Age",val:`${profile.age} years old`},{icon:"📍",label:"Location",val:profile.location},{icon:"💼",label:"Occupation",val:profile.occupation},{icon:"🌍",label:"Ethnicity",val:"Ijebu Yoruba"},{icon:"🙏🏾",label:"Religion",val:"Christian"},{icon:"💑",label:"Looking for",val:"Serious relationship"}].map((row,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize:18, width:26, textAlign:"center" }}>{row.icon}</span>
                <div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:2 }}>{row.label}</div>
                  <div style={{ fontSize:14, fontWeight:600 }}>{row.val}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab==="activity" && (
          <div style={{ padding:"20px", display:"flex", flexDirection:"column", gap:12 }}>
            {[{icon:"💛",text:"You liked Segun's post",time:"2h ago"},{icon:"💬",text:"Temi sent you a message",time:"3h ago"},{icon:"❤️",text:"12 people liked your profile",time:"Today"},{icon:"✨",text:"New match with Kemi!",time:"Yesterday"},{icon:"👁️",text:"47 profile views this week",time:"This week"}].map((row,i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"12px 14px", background:"rgba(255,255,255,0.03)", borderRadius:14, border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{row.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{row.text}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{row.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </main>
  );
}