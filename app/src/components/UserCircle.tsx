import getColorsFromName from "@/lib/color"
import './css/UserCircle.css'


export default function UserCircle ({user_name, size, onClick}: {user_name: string, size: number, onClick?: () => void}) {
    const colors = getColorsFromName(user_name)
    let AB_name = "";
      try{
        AB_name += user_name.split(" ")[0][0];
        if (user_name.split(" ")[1]) AB_name += user_name.split(" ")[1][0];
      }catch{}
    return(
        <div className={onClick ? "user-circle before" : "user-circle"} style={{
            cursor: onClick ? 'pointer' : 'default'
        }} onClick={onClick}>
            <div style={{
                background: colors.medium,
                width: size,
                height: size,
                fontWeight: 700,
                lineHeight: size + "px",
                borderRadius: size * 0.32,
                fontSize: size * 0.45
            }}>{AB_name}</div>
        </div>
    )
}