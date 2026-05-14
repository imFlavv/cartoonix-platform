# Test Plan: Early Access Payment Recovery

## 📋 SCENARIU DE TESTARE - Simulare Problemă Raportată

### Test 1: Recovery după pierdere completă a sesiunii (SCENARIUL CLIENTULUI)

**Obiectiv**: Verifică că utilizatorul care plătește dar pierde sesiunea poate finaliza înregistrarea

#### Pregătire
1. Pornește aplicația în modul Early Access
2. Asigură-te că ai configurare Stripe de test

#### Pași de testare

**Partea 1: Înregistrare până la plată**
1. ✅ Deschide `/early-access` într-un browser (sau Facebook in-app browser pe mobil)
2. ✅ Completează Step 1 (Date personale):
   - Alege avatar
   - Pseudonim: `TestUser123`
   - Email: `test@cartoonix.ro`
   - Parolă: `test123456`
   - Confirmă parola
   - Acceptă termenii
3. ✅ Click "Continuă"
4. ✅ Step 2 - Alege planul **PLUS**
5. ✅ Click "Plătește și continuă"
6. ✅ **ÎNAINTE de redirect la Stripe**: Deschide DevTools → Application → Local Storage
   - Verifică că există `cartoonix_early_access` cu token
   - **COPIAZĂ URL-ul curent** (pentru referință)
   - **COPIAZĂ token-ul** din localStorage

**Partea 2: Simulare pierdere sesiune**
7. ✅ Te redirectează la Stripe checkout
8. ✅ **IMPORTANT**: Înainte de a plăti, SIMULEAZĂ comportamentul utilizatorului:
   - Pe desktop: 
     ```javascript
     // În console DevTools
     localStorage.clear();
     sessionStorage.clear();
     console.log("Storage cleared - simulating app close");
     ```
   - Pe mobil: Închide complet aplicația/browserul (swipe away)
   
9. ✅ Completează plata în Stripe (folosește card de test: `4242 4242 4242 4242`)
10. ✅ După plată, Stripe te redirecționează la: 
    ```
    https://cartoonix.ro/early-access?session_id=cs_test_xxxxx
    ```

**Partea 3: Recovery și finalizare**
11. ✅ **VERIFICARE CRITICĂ**: 
    - DevTools → Application → Storage: localStorage și sessionStorage sunt goale
    - URL conține `session_id=cs_test_xxxxx`
    
12. ✅ Pagina ar trebui să:
    - Afișeze "Confirmăm plata..." (spinner)
    - Backend găsește pending după session_id
    - Frontend primește token + email
    - Salvează în localStorage
    - Toast: "Sesiune recuperată!"
    - **Step 3 apare automat** cu câmpul pentru cod

13. ✅ Verifică email la `test@cartoonix.ro`:
    - Ar trebui să primească codul de 6 cifre
    
14. ✅ Introdu codul în Step 3
15. ✅ Click "Verifică și creează cont"
16. ✅ Contul este creat cu succes
17. ✅ User e autentificat automat și redirecționat la `/` (EarlyAccessSuccessPage)

**Rezultat așteptat**: ✅ User plătește → pierde sesiunea → POATE finaliza înregistrarea

---

### Test 2: Flux normal (fără pierdere sesiune)

**Obiectiv**: Verifică că fluxul normal încă funcționează

#### Pași
1. Parcurge Step 1 și Step 2 (PLUS)
2. **NU șterge storage**
3. Plătește în Stripe
4. Revino automat pe site
5. Verifică că merge direct la Step 3 (codul)
6. Introdu codul și finalizează

**Rezultat așteptat**: ✅ Funcționează perfect cu storage intact

---

### Test 3: Multiple recovery attempts

**Obiectiv**: Verifică comportamentul când user încearcă același session_id de 2 ori

#### Pași
1. Completează o înregistrare PLUS cu recovery (Test 1)
2. **ÎNAINTE** de a introduce codul final
3. Copiază URL-ul cu `session_id`
4. Deschide același URL într-un tab nou (sau refreshează)
5. Verifică că:
   - Backend returnează `already_verified: true`
   - Frontend merge la Step 3 automat
   - Același cod de verificare e valid

**Rezultat așteptat**: ✅ Nu se creează duplicate, se reutilizează sesiunea existentă

---

### Test 4: Expirare după 2 ore

**Obiectiv**: Verifică că pending expiră corect după 2 ore

#### Pași (necesită așteptare sau modificare manuală în DB)
1. Creează o înregistrare PLUS
2. În MongoDB, setează manual `expires_at` la acum + 1 minut:
   ```javascript
   db.pending_early_access.updateOne(
     { _id: "token_aici" },
     { $set: { expires_at: new Date(Date.now() + 60000) } }
   )
   ```
3. Așteaptă 2 minute
4. Încearcă să verifici codul
5. Verifică că primești eroare: "Codul de verificare a expirat"

**Rezultat așteptat**: ✅ Expirarea funcționează corect

---

### Test 5: Recovery fără token în URL (doar session_id)

**Obiectiv**: Verifică că backend poate găsi pending doar cu session_id

#### Pași
1. Creează o înregistrare PLUS și ajunge la plată
2. După plată, copiază session_id din URL
3. Deschide DevTools Console și șterge storage:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```
4. Navighează manual la:
   ```
   /early-access?session_id=cs_test_xxxxx
   ```
5. Verifică în Network tab că request-ul la `/api/early-access/confirm-payment`:
   - NU conține `token` în body (sau e `null`)
   - Conține doar `session_id`
6. Backend ar trebui să:
   - Query Stripe pentru session
   - Extrage `client_reference_id` (token-ul)
   - Găsească pending cu acest token
   - Returneze token + email

**Rezultat așteptat**: ✅ Recovery complet fără niciun storage local

---

## 🔍 CHECKPOINTS DE VERIFICAT

### Backend logs să arate:
```
[early-access] confirm-payment called token=NONE... session=cs_test_xxxxx...
[early-access] Stripe session verified, client_reference_id extracted
[early-access] Found pending by client_reference_id
```

### Frontend Network tab:
**Request:**
```json
POST /api/early-access/confirm-payment
{
  "session_id": "cs_test_xxxxxxxxxxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "token": "abc123...",
  "email": "test@cartoonix.ro"
}
```

### Frontend localStorage după recovery:
```json
{
  "token": "abc123...",
  "email": "test@cartoonix.ro",
  "step": 2,
  "payment_confirmed": true,
  "saved_at": "2026-05-14T20:10:00.000Z"
}
```

---

## 🚨 RED FLAGS

Dacă vezi următoarele, înseamnă că fix-ul NU funcționează:

❌ Error "Înregistrarea nu a fost găsită" când revii cu session_id  
❌ Backend cere token obligatoriu în request  
❌ Frontend nu salvează în localStorage  
❌ Toast error în loc de "Sesiune recuperată!"  
❌ User e blocat la Step 2 după plată  

---

## ✅ SUCCESS CRITERIA

✔️ User poate plăti și finaliza înregistrarea chiar dacă:
  - Închide complet aplicația pe mobil
  - Șterge manual cache-ul
  - Revine după câteva minute
  
✔️ Backend poate găsi pending doar cu session_id de la Stripe  
✔️ Frontend recuperează automat token-ul și email-ul  
✔️ Expirarea e extinsă la 2 ore (suficient timp)  
✔️ Storage e persistent în localStorage  

---

## 📱 TESTARE PE DEVICE MOBIL REAL

**Cel mai important test** - simulează exact scenariul clientului:

1. Deschide link-ul de pe Facebook Messenger/WhatsApp pe mobil
2. Completează înregistrare PLUS
3. La redirect Stripe, comută la aplicația de banking (nu închide browser)
4. Aprobă plata în banking
5. Comută la Mail app pentru cod
6. Revino în browser (Facebook in-app sau Chrome)
7. Verifică că înregistrarea continuă de la Step 3

**Dacă reușește → FIX-ul funcționează perfect! 🎉**

---

## 🛠️ DEBUG HELPERS

### Verifică pending în MongoDB:
```javascript
db.pending_early_access.find({
  email: "test@cartoonix.ro"
}).pretty()
```

### Verifică când expiră:
```javascript
db.pending_early_access.aggregate([
  {
    $project: {
      email: 1,
      payment_verified: 1,
      expires_at: 1,
      minutes_until_expiry: {
        $divide: [
          { $subtract: ["$expires_at", new Date()] },
          60000
        ]
      }
    }
  }
])
```

### Șterge manual un pending pentru retry:
```javascript
db.pending_early_access.deleteOne({
  email: "test@cartoonix.ro"
})
```

---

**Last updated**: 2026-05-14  
**Fix version**: v1.0 - localStorage persistence + backend recovery
