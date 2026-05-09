## Usestate (pas dans les conditions ni boucles) : extrait de code 

------------------------------------------------------------------
function App() {
  const [Olona, setOlona] = useState({
    Anarana : 'Harena',
    Fanamapiny : 'Natolotriniavo',
    Taona : 23
  })
  console.log('render')
  
  const increment = () => {
  setOlona({...Olona, Taona: Olona.Taona +1})
  }

  return <>
    <h1>Taonan'olona : {Olona.Taona}</h1>
    <button onClick={increment}>Hampitombo taona</button>
  </>

}
------------------------------------------------------------------

## Formulaire (checkBox etc ...)

------------------------------------------------------------------
function App() {

  const  [value, setValue] = useState('')
  const handleform = (e) => {
    setValue(e.target.value)
    console.log('render')
    // targer <==> form
  }

  const [check, setCheck] = useState(true)
  const toggleCheck = () => {
    setCheck(!check)
  }

  return <>
    <form>
      <p>Entrez votre Nom :</p> 
      {/* <input type="text" name="Anarana" value={value} onChange={handleform}/> */}
      <textarea value={value} onChange={handleform}></textarea>
      <input type="checkbox" checked={check} onChange={toggleCheck} />
      {/* {check && <button>Envoyer</button>} */}
      <button disabled={!check}>Envoyer</button>
    </form>
  </>

}
------------------------------------------------------------------

## Flux de donnees react 

------------------------------------------------------------------
function App() {

  const [isTermAccepted, setisTermAccepted] = useState(false)

  return <form>
    <CGUChexbox checked = {isTermAccepted} oncheck={setisTermAccepted}/>
    <button disabled={!isTermAccepted}>Envoyer Formulaire</button>
  </form>

}

function CGUChexbox ({checked,oncheck}) {
  return <div>
    <label>
      <input type="checkbox"
      onChange={(e) => oncheck(e.target.checked)} checked={checked}  />
      Accepter les conditions générales d'utilisation
    </label>
  </div>
}
-------------------------------------------------------------